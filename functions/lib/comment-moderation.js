import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const moderationRoots = ['HudHudDev', 'HudHudOfficial'];

// Patterns for local Stage 1 filtering
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/i;
const SOCIAL_LINK_PATTERN = /(?:t\.me\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly\/)\S+/i;
const PHONE_PATTERN = /(?:\+?[\d\s-]{8,}\d)/;

// Curated list of severe Arabic & Yemeni vulgarities / profanities
const PROFANITY_PATTERNS = [
  /قحب[ةه]/i,
  /منيو[كك]/i,
  /عرص[ةه]?/i,
  /كس\s*أ[مخ]/i,
  /طيز/i,
  /زب[يى]/i,
  /ابن\s*الحرام/i,
  /لعنة\s*الله/i,
  /دلوخ/i,
  /يا\s*كلب/i,
  /يا\s*حمار/i,
  /سربوت/i,
  /شرموط[ةه]?/i,
];

/**
 * Stage 1: Free local regex filtering for URLs, phone numbers, and severe profanity.
 */
export function filterLocally(content) {
  if (typeof content !== 'string' || content.trim().length === 0) {
    return { isClean: false, reason: 'empty_content' };
  }

  const text = content.trim();

  if (URL_PATTERN.test(text) || SOCIAL_LINK_PATTERN.test(text)) {
    return { isClean: false, reason: 'local_blocklist_link' };
  }

  if (PHONE_PATTERN.test(text)) {
    return { isClean: false, reason: 'local_blocklist_phone' };
  }

  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      return { isClean: false, reason: 'local_blocklist_profanity' };
    }
  }

  return { isClean: true };
}

/**
 * Stage 2: Cost-aware Gemini 2.5 Flash check for Yemeni dialect and standard Arabic nuances.
 */
export async function filterWithGemini(content, { apiKey, fetchFn = globalThis.fetch } = {}) {
  if (!apiKey) {
    logger.info('Gemini API key not configured; comment passed Stage 1 and marked clean.');
    return { isAppropriate: true, flagReason: null };
  }

  const prompt = `أنت مراقب محتوى لتطبيق "الهدهد" للبث الإذاعي والبودكاست في اليمن.
حلل نص التعليق التالي وحدد إذا كان يحتوي على:
1. سب أو شتم أو ألفاظ خادشة للحياء (باللهجة اليمنية أو العربية).
2. خطاب كراهية أو تحريض مناطقي أو طائفي أو سياسي عنيف في اليمن.
3. إعلانات سبام تجارية أو احتيالية.

التعليق: "${content.replace(/"/g, '\\"')}"

أجب فقط بصيغة JSON على النحو التالي دون أي نصوص أخرى:
{"isAppropriate": boolean, "flagReason": string | null}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const res = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          maxOutputTokens: 40,
          temperature: 0.0,
        },
      }),
    });

    if (!res.ok) {
      logger.warn(`Gemini API returned status ${res.status}; falling back to safe pass.`);
      return { isAppropriate: true, flagReason: null };
    }

    const data = await res.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      return { isAppropriate: true, flagReason: null };
    }

    const parsed = JSON.parse(candidateText.trim());
    return {
      isAppropriate: Boolean(parsed.isAppropriate),
      flagReason: parsed.flagReason || (parsed.isAppropriate ? null : 'ai_flagged'),
    };
  } catch (err) {
    logger.warn(`Gemini moderation check failed: ${err?.message}; falling back to safe pass.`);
    return { isAppropriate: true, flagReason: null };
  }
}

/**
 * Evaluates the two-stage pipeline for a comment content string.
 */
export async function moderateCommentContent(content, options = {}) {
  // Stage 1: Free Local Regex Filter
  const localRes = filterLocally(content);
  if (!localRes.isClean) {
    return {
      status: 'rejected',
      moderationReason: localRes.reason,
    };
  }

  // Stage 2: Gemini 2.5 Flash Filter
  const aiRes = await filterWithGemini(content, options);
  if (!aiRes.isAppropriate) {
    return {
      status: 'flagged',
      moderationReason: aiRes.flagReason || 'ai_flagged',
    };
  }

  return {
    status: 'published',
    moderationReason: null,
  };
}

/**
 * Handles new comment document creation in Firestore.
 */
export async function handleCommentCreated({
  snapshot,
  root,
  episodeId,
  geminiApiKey,
  fetchFn = globalThis.fetch,
}) {
  if (!moderationRoots.includes(root) || !snapshot?.exists) return null;

  const data = snapshot.data();
  const content = data?.content;

  if (typeof content !== 'string') return null;

  // Don't re-moderate if already decided (IR-06: include hidden and removed)
  if (['rejected', 'flagged', 'hidden', 'removed'].includes(data.status)) {
    return null;
  }

  const result = await moderateCommentContent(content, { apiKey: geminiApiKey, fetchFn });

  const updateData = {
    status: result.status,
    moderationReason: result.moderationReason,
    moderatedAt: FieldValue.serverTimestamp(),
  };

  // Guard against overwriting concurrent manual moderator actions (IR-06)
  if (snapshot.ref?.firestore?.runTransaction) {
    await snapshot.ref.firestore.runTransaction(async (tx) => {
      const fresh = await tx.get(snapshot.ref);
      if (!fresh.exists) return;
      const currentStatus = fresh.data()?.status;
      if (['rejected', 'flagged', 'hidden', 'removed'].includes(currentStatus)) {
        logger.info(`Comment ${snapshot.id} already moderated to ${currentStatus}; preserving decision`);
        return;
      }
      tx.update(snapshot.ref, updateData);
    });
  } else {
    if (snapshot.ref?.get) {
      const fresh = await snapshot.ref.get();
      const currentStatus = fresh?.data?.()?.status;
      if (['rejected', 'flagged', 'hidden', 'removed'].includes(currentStatus)) {
        return result;
      }
    }
    await snapshot.ref.update(updateData);
  }
  logger.info(`Comment ${snapshot.id} in episode ${episodeId} moderated to status: ${result.status} (${result.moderationReason || 'clean'})`);

  return result;
}
