package com.sana.dev.fm.utils.my_firebase.notification;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.media.RingtoneManager;
import android.net.Uri;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.PreferencesManager;

import java.util.Map;
import java.util.Random;

/**
 * NOTE: There can only be one service in each app that receives FCM messages. If multiple
 * are declared in the Manifest then the first one will be chosen.
 * <p>
 * In order to make this Java sample functional, you must remove the following from the Kotlin messaging
 * service in the AndroidManifest.xml:
 * <p>
 * <intent-filter>
 * <action android:name="com.google.firebase.MESSAGING_EVENT" />
 * </intent-filter>
 */

public class FcmMessagingService extends FirebaseMessagingService {
    private static final String TAG = FcmMessagingService.class.getSimpleName();

    /**
     * Called when message is received.
     *
     * @param remoteMessage Object representing the message received from Firebase Cloud Messaging.
     */
    // [START receive_message]
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Not getting messages here? See why this may be: https://goo.gl/39bRNJ
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Check if message contains a data payload.
        if (remoteMessage.getData().size() > 0) {
//            handleDataMessage(remoteMessage.getData());

            Log.d(TAG, "Message data payload: " + remoteMessage.getData());

            if (/* Check if data needs to be processed by long running job */ true) {
                // For long-running tasks (10 seconds or more) use WorkManager.
                scheduleJob();
            } else {
                // Handle message within 10 seconds
                handleNow();
            }

        }

        // Check if message contains a notification payload.
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Message Notification Body: " + remoteMessage.getNotification().getBody());
            String notificationTitle = remoteMessage.getNotification().getTitle();
            String notificationContent = remoteMessage.getNotification().getBody();
            Uri notificationImage = remoteMessage.getNotification().getImageUrl();
            createNotification(notificationTitle, notificationContent, notificationImage);
        }

    }
    // [END receive_message]


    // [START on_new_token]

    /**
     * Called if InstanceID token is updated. This may occur if the security of
     * the previous token had been compromised. Note that this is called when the InstanceID token
     * is initially generated so this is where you would retrieve the token.
     */
    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);

        // If you want to send messages to this application instance or
        // manage this apps subscriptions on the server side, send the
        // Instance ID token to your app server.
        sendRegistrationToServer(token);
    }
    // [END on_new_token]

    /**
     * Schedule async work using WorkManager.
     */
    private void scheduleJob() {
        // [START dispatch_job]
//        OneTimeWorkRequest work = new OneTimeWorkRequest.Builder(MyWorker.class)
//                .build();
//        WorkManager.getInstance().beginWith(work).enqueue();
        // [END dispatch_job]
    }

    /**
     * Handle time allotted to BroadcastReceivers.
     */
    private void handleNow() {
        Log.d(TAG, "Short lived task is done.");
    }

    private void handleDataMessage(Map<String, String> data) {
        // Extract data from the message (title, body, etc.)
        String title = data.get("title");
        String body = data.get("body");

        // Process the data message based on its content (e.g., update UI, trigger actions)
        // You could also show a notification here if the data message is critical
    }

    /**
     * Persist token to third-party servers.
     * <p>
     * Modify this method to associate the user's FCM InstanceID token with any server-side account
     * maintained by your application.
     *
     * @param token The new token.
     */
    private void sendRegistrationToServer(String token) {
        // TODO: Implement this method to send token to your app server.
        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_FCM_TOKEN, token);
//        getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).edit().putString(AppConstant.General.FIREBASE_FCM_TOKEN, token).apply();
    }

    //     Todo fix notification on android 14
    private void createNotification(String notificationTitle, String messageBody, Uri imageUri) {
        Intent notificationIntent = IntentHelper.mainActivity(this, true);
        PendingIntent pendingIntent = null;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getActivity
                    (this, 0, notificationIntent, PendingIntent.FLAG_MUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity
                    (this, 0, notificationIntent, PendingIntent.FLAG_ONE_SHOT);
        }

        // Let's create a notification builder object
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, getResources().getString(R.string.default_notification_channel_id));
        // Create a notificationManager object
        NotificationManager notificationManager = (NotificationManager) this.getSystemService(NOTIFICATION_SERVICE);
        // If android version is greater than 8.0 then create notification channel
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {

            // Create a notification channel
            String channelId = getString(R.string.default_notification_channel_id);
            CharSequence channelName = getString(R.string.default_notification_channel_name);
            String channelDescription = getString(R.string.default_notification_channel_description);
            int importance = NotificationManager.IMPORTANCE_DEFAULT;
            NotificationChannel notificationChannel = new NotificationChannel(channelId, channelName, importance);
            notificationChannel.setDescription(channelDescription);            // Set properties to notification channel
            notificationChannel.enableLights(true);
            notificationChannel.setLightColor(getResources().getColor(R.color.colorPrimaryLight));
            notificationChannel.enableVibration(true);
            notificationChannel.setVibrationPattern(new long[]{100, 200, 300});

            // Pass the notificationChannel object to notificationManager
            notificationManager.createNotificationChannel(notificationChannel);
        }


        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
// Set the notification parameters to the notification builder object
        builder.setContentTitle(notificationTitle)
                .setContentText(messageBody)
//                .setSmallIcon(R.mipmap.ic_launcher)
                .setSound(defaultSoundUri)
                .setAutoCancel(true);

//        if (android.os.Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        builder.setSmallIcon(R.drawable.ic_radio);
        builder.setColor(getResources().getColor(R.color.colorPrimary));
//        } else {
//            builder.setSmallIcon(R.mipmap.ic_launcher_round);
//        }

// Set the image for the notification
        if (imageUri != null) {
            try {
                Log.w(TAG, "Image  : " + imageUri);
//                String imageUrl = "https://www.example.com/image.jpg";
//                ImageView imageView = new ImageView();
//                new DownloadImageTask(imageView).execute(imageUrl);

                // Download the image
                Bitmap bitmap = FmUtilize.downloadImage(imageUri.toString());
                if (bitmap == null) {
                    // Handle download error (e.g., send notification without image)
                    builder.setStyle(
                            new NotificationCompat.BigPictureStyle()
                                    .bigPicture(bitmap)
                                    .bigLargeIcon(null)
                    ).setLargeIcon(bitmap);
                }


            } catch (Exception e) {
                e.printStackTrace();
                Log.e(TAG, "Image Notification not exist : " + e);
            }
        }

        builder.setContentIntent(pendingIntent);
        notificationManager.notify(new Random().nextInt(), builder.build());
    }
}