package com.sana.dev.fm.utils.radio_player;

import static android.content.Context.NOTIFICATION_SERVICE;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.radio_player.metadata.Metadata;


public class MediaNotificationManager {

    public static final int NOTIFICATION_ID = 555;
    public static final String NOTIFICATION_CHANNEL_ID = "radio_channel";

    private RadioService service;

    private Metadata meta;

    private Bitmap notifyIcon;
    private String playbackStatus;

//    private Resources resources;

    public Metadata getMetaData() {
        return meta;
    }

    public Context getMyContext(){
        return MyContextWrapper.wrap(service, PreferencesManager.getInstance().getPrefLange());
    }

    public MediaNotificationManager(RadioService service) {
        this.service = service;
//        this.resources = service.getResources();
    }

    public void startNotify(String playbackStatus) {
        this.playbackStatus = playbackStatus;
        this.notifyIcon = BitmapFactory.decodeResource(getMyContext().getResources(), R.mipmap.ic_launcher_round);
        startNotify();
    }


    public void startNotify(Bitmap notifyIcon, Metadata meta) {
        this.notifyIcon = notifyIcon;
        this.meta = meta;
        startNotify();
//        notificationActions();
    }

    private void startNotify() {
        if (playbackStatus == null) return;

        if (notifyIcon == null)
            notifyIcon = BitmapFactory.decodeResource(getMyContext().getResources(), R.mipmap.ic_launcher_round);

        NotificationManager notificationManager =
                (NotificationManager) service.getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            /* Create or update. */
            NotificationChannel channel = new NotificationChannel(NOTIFICATION_CHANNEL_ID,
                    service.getString(R.string.audio_notification),
                    NotificationManager.IMPORTANCE_LOW);
            channel.enableVibration(false);
            channel.enableLights(true);
            channel.setLightColor(R.color.white);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }

        int icon = R.drawable.ic_pause;
        Intent playbackAction = new Intent(service, RadioService.class);
        playbackAction.setAction(RadioService.ACTION_PAUSE);
//        PendingIntent action = PendingIntent.getService(service, 1, playbackAction, 0);
        PendingIntent action;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            action = PendingIntent.getService(service, 1, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            action = PendingIntent.getService(service, 1, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        if (playbackStatus.equals(PlaybackStatus.PAUSED)) {
            icon = R.drawable.ic_play;
            playbackAction.setAction(RadioService.ACTION_PLAY);
//            action = PendingIntent.getService(service, 2, playbackAction, 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                action = PendingIntent.getService(service, 2, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            } else {
                action = PendingIntent.getService(service, 2, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT);
            }
        }

        Intent stopIntent = new Intent(service, RadioService.class);
        stopIntent.setAction(RadioService.ACTION_STOP);
//        PendingIntent stopAction = PendingIntent.getService(service, 3, stopIntent, 0);
        PendingIntent stopAction;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            stopAction = PendingIntent.getService(service, 3, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            stopAction = PendingIntent.getService(service, 3, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        Intent intent = new Intent(service, MainActivity.class);
        Bundle bundle = new Bundle();
        bundle.putStringArray(MainActivity.FRAGMENT_DATA, new String[]{service.getStreamUrl().getUrl()});
        meta = service.getStreamUrl();
//        bundle.putSerializable(MainBottomNav.FRAGMENT_CLASS, MainBottomNav.class);
        intent.putExtras(bundle);

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//        PendingIntent pendingIntent = PendingIntent.getActivity(service, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT);
        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getActivity(service, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity(service, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT);
        }

        NotificationManagerCompat.from(service).cancel(NOTIFICATION_ID);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(service, NOTIFICATION_CHANNEL_ID);


//        String title = meta != null && meta.getArtist() != null ?
//                meta.getArtist() : getMyContext().getResources().getString(R.string.notification_playing);
//        String subTitle = meta != null && meta.getSong() != null ?
//                meta.getSong() : getMyContext().getResources().getString(R.string.app_name);

        builder.
                setContentTitle(meta.getStation() + " " + meta.getChannels())
                .setContentText(getMyContext().getResources().getString(R.string.notification_playing))
                .setLargeIcon(notifyIcon)
                .setContentIntent(pendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSmallIcon(R.mipmap.ic_launcher_round)
                .addAction(icon, getMyContext().getResources().getString(R.string.pause), action)
                .addAction(R.drawable.ic_stop, getMyContext().getResources().getString(R.string.stop), stopAction)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(false)
                .setOngoing(true) // Cant cancel your notification (except NotificationManger.cancel(); )
                .setWhen(System.currentTimeMillis())
                .setColor(ContextCompat.getColor(service, R.color.colorPrimaryDark))
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setMediaSession(service.getMediaSession().getSessionToken())
                        .setShowActionsInCompactView(0, 1)
                        .setShowCancelButton(true)
                        .setCancelButtonIntent(stopAction));


        Notification notification = builder.build();


        service.startForeground(NOTIFICATION_ID, notification);

    }


    public void cancelNotify() {
        Intent buttonIntent = new Intent(service, MainActivity.class);
        int notificationId = buttonIntent.getIntExtra("notificationId", NOTIFICATION_ID);
        NotificationManager manager = (NotificationManager) service. getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(notificationId);
        service.stopForeground(true);
    }


/*
    private void notificationActions() {

        int NOTIFICATION_ID = 1;


        NotificationCompat.Builder builder = new NotificationCompat.Builder(service);
        builder.setSmallIcon(R.mipmap.ic_launcher_round);
        builder.setColor(ContextCompat.getColor(service, R.color.colorPrimaryDark));
        builder.setLargeIcon(BitmapFactory.decodeResource(service.getResources(), R.mipmap.ic_launcher_round));
        builder.setContentTitle("Notification Actions");
        builder.setContentText("Tap View to launch our website");
        builder.setAutoCancel(true);
        PendingIntent launchIntent = getLaunchIntent(NOTIFICATION_ID, service);

        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.journaldev.com"));
        PendingIntent pendingIntent = PendingIntent.getActivity(service, 0, intent, 0);

        Intent buttonIntent = new Intent(service, MainActivity.class);
        buttonIntent.putExtra("notificationId", NOTIFICATION_ID);
        PendingIntent dismissIntent = PendingIntent.getBroadcast(service, 0, buttonIntent, 0);

        builder.setContentIntent(launchIntent);
        builder.addAction(R.drawable.ic_stop, "VIEW", pendingIntent);
        builder.addAction(R.drawable.ic_play, "DISMISS", dismissIntent);

        NotificationManager notificationManager = (NotificationManager) service.getSystemService(NOTIFICATION_SERVICE);

        // Will display the notification in the notification bar
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }


    public PendingIntent getLaunchIntent(int notificationId, Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        intent.putExtra("notificationId", notificationId);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT);
    }
*/


/*
    private void clearNotification() {
        int notificationId = getIntent().getIntExtra("notificationId", 0);
        NotificationManager manager = (NotificationManager) service. getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(notificationId);
    }
*/


}
