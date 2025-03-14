package com.sana.dev.fm.utils.my_firebase.notification;

import static com.sana.dev.fm.utils.FmUtilize.resizeImage;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.PreferencesManager;

import java.util.List;
import java.util.Map;

public class FcmMessagingService extends FirebaseMessagingService {
    private static final String TAG = FcmMessagingService.class.getSimpleName();
    public static final String ACTION_NOTIFICATION_RECEIVED= "com.sana.dev.fm.NOTIFICATION_RECEIVED";
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel(); // Create notification channel on service creation
    }

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());

/*        // Handle data payload
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            handleDataMessage(remoteMessage.getData());
        }

        // Handle notification payload
        if (remoteMessage.getNotification() != null) {
            RemoteMessage.Notification notification = remoteMessage.getNotification();
            Log.d(TAG, "Message Notification Body: " + notification.getBody());
            createNotification(notification.getTitle(), notification.getBody(), notification.getImageUrl());
        }*/

        if (isAppInForeground()) {
            // App is in the foreground, handle the message in-app
            // Handle notification payload
            if (remoteMessage.getNotification() != null) {
                RemoteMessage.Notification notification = remoteMessage.getNotification();
                Log.d(TAG, "Message Notification Body: " + notification.getBody());
                handleInAppNotification(notification.getTitle(), notification.getBody(), notification.getImageUrl());
            }
        } else {
            // App is in the background, show a notification
            if (remoteMessage.getNotification() != null) {
                createNotification(remoteMessage.getNotification().getTitle(), remoteMessage.getNotification().getBody(), remoteMessage.getNotification().getImageUrl());
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        sendRegistrationToServer(token);
    }

    private void handleInAppNotification(String title, String message, Uri imageUrl) {
        // Example: Show a toast message
        // Toast.makeText(this, title + ": " + message, Toast.LENGTH_LONG).show();

        // Example: Send a broadcast to update the UI
        Intent intent = new Intent(ACTION_NOTIFICATION_RECEIVED);
        intent.putExtra("title", title);
        intent.putExtra("message", message);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);

        // Example: Show an in-app dialog (requires an Activity context)
        // new AlertDialog.Builder(this)
        //     .setTitle(title)
        //     .setMessage(message)
        //     .setPositiveButton("OK", null)
        //     .show();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = getString(R.string.default_notification_channel_id);
            if (notificationManager.getNotificationChannel(channelId) == null) {
                NotificationChannel channel = new NotificationChannel(
                        channelId,
                        getString(R.string.default_notification_channel_name),
                        NotificationManager.IMPORTANCE_HIGH // Use HIGH for priority
                );
                channel.setDescription(getString(R.string.default_notification_channel_description));
                channel.enableLights(true);
                channel.setLightColor(getResources().getColor(R.color.colorPrimaryLight));
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{100, 200, 300});
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    private void createNotification(String notificationTitle, String messageBody, Uri imageUri) {
        Intent notificationIntent = IntentHelper.mainActivity(this, true);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        } else {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, notificationIntent, flags);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, getString(R.string.default_notification_channel_id))
                .setContentTitle(notificationTitle)
                .setContentText(messageBody)
                .setSmallIcon(R.drawable.ic_radio)
                .setColor(getResources().getColor(R.color.colorPrimary))
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE);

        if (imageUri != null) {
            Bitmap bitmap = FmUtilize.downloadImage(this,imageUri.toString());
            if (bitmap != null) {
                bitmap = resizeImage(bitmap, 500, 500); // Resize the image
                NotificationCompat.BigPictureStyle bigPictureStyle = new NotificationCompat.BigPictureStyle()
                        .bigPicture(bitmap)
                        .bigLargeIcon(null);
                builder.setStyle(bigPictureStyle)
                        .setLargeIcon(bitmap);
            } else {
                Log.e(TAG, "Failed to download or resize image");
                builder.setLargeIcon(BitmapFactory.decodeResource(getResources(), R.drawable.ic_radio)); // Fallback icon
            }
        }

        int notificationId = (notificationTitle + messageBody).hashCode();
        notificationManager.notify(notificationId, builder.build());
    }
    private void handleDataMessage(Map<String, String> data) {
        String title = data.get("title");
        String body = data.get("body");
        String imageUrl = data.get("image");

        if (title != null && body != null) {
            createNotification(title, body, imageUrl != null ? Uri.parse(imageUrl) : null);
        }
    }

    private void sendRegistrationToServer(String token) {
        PreferencesManager.getInstance().write(AppConstant.General.FIREBASE_FCM_TOKEN, token);
    }

    private boolean isAppInForeground() {
        ActivityManager manager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        List<ActivityManager.RunningAppProcessInfo> processes = manager.getRunningAppProcesses();
        for (ActivityManager.RunningAppProcessInfo process : processes) {
            if (process.processName.equals(getPackageName()) && process.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND) {
                return true;
            }
        }
        return false;
    }
}