import { logger } from 'firebase-functions';

export const programRoots = ['HudHudDev', 'HudHudOfficial'];

/**
 * Returns Yemen time details (Asia/Aden: UTC+3):
 * - weekday: ISO 8601 (1 = Monday ... 7 = Sunday)
 * - currentMinute: minute of day (0..1439)
 * - ymd: formatted date string YYYY-MM-DD
 */
export function getYemenTimeInfo(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Aden',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));

  const weekdayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const weekday = weekdayMap[map.weekday] || 1;
  const hour = parseInt(map.hour, 10) % 24;
  const minute = parseInt(map.minute, 10);
  const currentMinute = hour * 60 + minute;
  const ymd = `${map.year}-${map.month}-${map.day}`;

  return { weekday, currentMinute, ymd };
}

/**
 * Evaluates whether a program should trigger a notification now:
 * - Program is active (isActive === true)
 * - Today's weekday is in schedule.weekdays
 * - Program starts within 0 to 10 minutes from now (startMinute - currentMinute in [0, 10])
 * - Has not already been notified today (lastNotifiedDate !== todayYmd)
 */
export function shouldNotifyProgram(programData, timeInfo) {
  if (programData?.isActive !== true) return false;
  const schedule = programData?.schedule;
  if (!schedule) return false;
  if (!Array.isArray(schedule.weekdays) || !schedule.weekdays.includes(timeInfo.weekday)) {
    return false;
  }
  const startMinute = Number(schedule.startMinute);
  if (Number.isNaN(startMinute)) return false;

  const diff = startMinute - timeInfo.currentMinute;
  if (diff < 0 || diff > 10) return false;

  if (programData.lastNotifiedDate === timeInfo.ymd) return false;

  return true;
}

/**
 * Builds standard topic-based FCM payload for program notification.
 * Namespaces topic with root to avoid cross-environment collisions (IR-08).
 */
export function createProgramFcmMessage({ programId, programTitle, stationId, stationName, root }) {
  const topic = root && root !== 'HudHudOfficial'
    ? `${root.toLowerCase()}_program_${programId}`
    : `program_${programId}`;
  return {
    topic,
    notification: {
      title: 'بدء برنامج مباشر 📻',
      body: `يبدأ الآن برنامج "${programTitle}" عبر ${stationName || 'إذاعتك المفضلة'}`,
    },
    data: {
      type: 'program_live',
      programId: String(programId),
      stationId: String(stationId || ''),
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'program_alerts',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
  };
}

/**
 * Scans programs in root collection, identifies programs starting within 10 minutes,
 * sends FCM topic messages, and stamps lastNotifiedDate.
 */
export async function notifyUpcomingProgramsForRoot({
  firestore,
  messaging,
  root,
  now = new Date(),
}) {
  if (!programRoots.includes(root)) {
    throw new Error(`Unknown root environment: ${root}`);
  }

  const timeInfo = getYemenTimeInfo(now);
  const programsRef = firestore.collection(root).doc('programs').collection('programs');
  const snapshot = await programsRef.where('isActive', '==', true).get();

  let checked = 0;
  let notified = 0;
  let skipped = 0;

  for (const doc of snapshot.docs) {
    checked++;
    const data = doc.data();

    if (!shouldNotifyProgram(data, timeInfo)) {
      skipped++;
      continue;
    }

    // Resolve station name if available
    let stationName = '';
    if (data.stationId) {
      try {
        const stationDoc = await firestore
          .collection(root)
          .doc('stations')
          .collection('stations')
          .doc(data.stationId)
          .get();
        if (stationDoc.exists) {
          stationName = stationDoc.data()?.name || '';
        }
      } catch (err) {
        logger.warn(`Could not resolve station name for program ${doc.id}: ${err?.message}`);
      }
    }

    const message = createProgramFcmMessage({
      programId: doc.id,
      programTitle: data.title || 'برنامج مميز',
      stationId: data.stationId,
      stationName,
      root,
    });

    try {
      // Idempotency update before send to prevent duplicate broadcasts on retry (IR-08)
      await doc.ref.update({
        lastNotifiedDate: timeInfo.ymd,
      });

      if (messaging) {
        await messaging.send(message);
      }
      notified++;
      logger.info(`Notified topic ${message.topic} for "${data.title}" starting today at minute ${data.schedule?.startMinute}`);
    } catch (err) {
      logger.error(`Failed to send FCM topic alert for program ${doc.id}: ${err?.message}`);
    }
  }

  return { root, total: snapshot.size, checked, notified, skipped };
}
