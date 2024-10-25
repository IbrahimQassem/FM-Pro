package com.sana.dev.fm.utils.playerpro;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaMetadataRetriever;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.interfaces.MetadataListener;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.LogUtility;

import java.io.IOException;
import java.util.HashMap;
import java.util.Timer;
import java.util.TimerTask;

public class RadioPlayerService extends Service implements MediaPlayer.OnPreparedListener, MediaPlayer.OnErrorListener {
    private static final String TAG = RadioPlayerService.class.getSimpleName();
    private static final String CHANNEL_ID = "radio_channel";
    private static final int NOTIFICATION_ID = 1;
    public static final String ACTION_PLAY = "com.sana.dev.fm.utils.playerpro.action.PLAY";
    public static final String ACTION_PAUSE = "com.sana.dev.fm.utils.playerpro.action.PAUSE";
    public static final String ACTION_STOP = "com.sana.dev.fm.utils.playerpro.action.STOP";
    private MediaPlayer mediaPlayer;
    private String streamUrl;
    private String streamTitle = "Radio Player";
    private boolean isPlaying = false;
    private final IBinder binder = new LocalBinder();
    private MetadataListener metadataListener;
    private Timer metadataTimer;
    private FloatingActionButton playPauseButton;
    private PlayerState currentState = PlayerState.STOPPED;
    private NotificationManager notificationManager;

    private enum PlayerState {
        PLAYING, PAUSED, STOPPED
    }

    public void setPlayPauseButton(FloatingActionButton button) {
        this.playPauseButton = button;
        updatePlayPauseButton();
    }

    public void setMetadataListener(MetadataListener listener) {
        this.metadataListener = listener;
    }

    public class LocalBinder extends Binder {
        public RadioPlayerService getService() {
            return RadioPlayerService.this;
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        notificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            switch (intent.getAction()) {
                case ACTION_PLAY:
                    play();
                    break;
                case ACTION_PAUSE:
                    pause();
                    break;
                case ACTION_STOP:
//                    stop();
                    stopRadio();
                    break;
            }
        }
        return START_NOT_STICKY;
    }


    public void initializeMediaPlayer(String url, String title) {
        this.streamUrl = url;
        this.streamTitle = title;
        if (mediaPlayer == null) {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build());
            mediaPlayer.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
            mediaPlayer.setOnPreparedListener(this);
            mediaPlayer.setOnErrorListener(this);
        }
        startMetadataTimer();
    }

    private void startMetadataTimer() {
        if (metadataTimer != null) {
            metadataTimer.cancel();
        }
        metadataTimer = new Timer();
        metadataTimer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                fetchMetadata();
            }
        }, 0, 5000); // Check metadata every 5 seconds
    }

    private void fetchMetadata() {
        try {
            MediaMetadataRetriever retriever = new MediaMetadataRetriever();
            retriever.setDataSource(streamUrl, new HashMap<String, String>());

            String title = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE);
            String artist = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST);

            if (metadataListener != null && title != null) {
                metadataListener.onMetadataReceived(title, artist);
                streamTitle = title + (artist != null ? " - " + artist : "");
                updateNotification();
            }

            retriever.release();
        } catch (Exception e) {
            LogUtility.e(TAG, "Error fetching metadata: " + e.getMessage());
        }
    }

    public void play() {
        if (!isPlaying) {
            try {
                if (mediaPlayer != null) {
                    mediaPlayer.reset();
                    mediaPlayer.setDataSource(streamUrl);
                    mediaPlayer.prepareAsync();
                    currentState = PlayerState.PLAYING;
                    updatePlayPauseButton();
                }
            } catch (IOException e) {
                LogUtility.d(TAG, "Error startPlay : " + e.getMessage());
                e.printStackTrace();
            }
        }
    }

    public void pause() {
        if (mediaPlayer != null && isPlaying) {
            mediaPlayer.pause();
            isPlaying = false;
            currentState = PlayerState.PAUSED;
            updatePlayPauseButton();
            updateNotification();
        }
    }

    public void stop() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            mediaPlayer.reset();
            isPlaying = false;
            currentState = PlayerState.STOPPED;
            updatePlayPauseButton();
//            updateNotification();
            clearNotification();
        }
    }

    public void stopRadio() {
        stop();
//        if (mediaPlayer != null) {
//            mediaPlayer.stop();
//            mediaPlayer.release();
//            mediaPlayer = null;
//        }
//        isPlaying = false;
//        currentState = PlayerState.STOPPED;
//        updatePlayPauseButton();
//        clearNotification();
////        stopSelf();
    }

    private void clearNotification() {
        notificationManager.cancel(NOTIFICATION_ID);
        stopForeground(true);
    }

    private void updatePlayPauseButton() {
        if (playPauseButton != null) {
            playPauseButton.post(() -> {
                switch (currentState) {
                    case PLAYING:
                        playPauseButton.setImageResource(R.drawable.ic_pause);
                        break;
                    case PAUSED:
                        playPauseButton.setImageResource(R.drawable.ic_play);
                        break;
                    case STOPPED:
                        playPauseButton.setImageResource(R.drawable.ic_radio);
                        break;
                }
            });
        }
    }

    public void playOrPause(String newStreamUrl, String newTitle) {
        if (newStreamUrl != null && !newStreamUrl.equals(streamUrl)) {
            streamUrl = newStreamUrl;
            streamTitle = newTitle;
        }

        switch (currentState) {
            case STOPPED:
            case PAUSED:
                play();
                break;
            case PLAYING:
                pause();
                break;
        }
        updateNotification();
    }

    @Override
    public void onPrepared(MediaPlayer mp) {
        mp.start();
        isPlaying = true;
        currentState = PlayerState.PLAYING;
        updatePlayPauseButton();
        updateNotification();
    }

    @Override
    public boolean onError(MediaPlayer mp, int what, int extra) {
        isPlaying = false;
        currentState = PlayerState.STOPPED;
        updatePlayPauseButton();
        clearNotification();
        LogUtility.e(TAG, "MediaPlayer Error: " + what + ", " + extra);
        return false;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    streamTitle,
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

/*
    private void updateNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0,
                notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent playIntent = new Intent(this, RadioPlayerService.class);
        playIntent.setAction("PLAY");
        PendingIntent playPendingIntent = PendingIntent.getService(this, 0,
                playIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent pauseIntent = new Intent(this, RadioPlayerService.class);
        pauseIntent.setAction("PAUSE");
        PendingIntent pausePendingIntent = PendingIntent.getService(this, 0,
                pauseIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, RadioPlayerService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 0,
                stopIntent, PendingIntent.FLAG_IMMUTABLE);

        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.ic_radio);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(streamTitle)
                .setContentText(isPlaying ? "Playing" : "Paused")
                .setSmallIcon(R.drawable.ic_music_note)
                .setLargeIcon(largeIcon)
                .setContentIntent(pendingIntent)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1, 2));

        // Add actions based on current state
        switch (currentState) {
            case PLAYING:
                builder.addAction(R.drawable.ic_pause, "Pause", pausePendingIntent)
                        .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent);
                break;
            case PAUSED:
            case STOPPED:
                builder.addAction(R.drawable.ic_play, "Play", playPendingIntent)
                        .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent);
                break;
        }

        startForeground(NOTIFICATION_ID, builder.build());
    }
*/

    private void updateNotificationZ() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0,
                notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent playIntent = new Intent(this, RadioPlayerService.class);
        playIntent.setAction("PLAY");
        PendingIntent playPendingIntent = PendingIntent.getService(this, 0,
                playIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent pauseIntent = new Intent(this, RadioPlayerService.class);
        pauseIntent.setAction("PAUSE");
        PendingIntent pausePendingIntent = PendingIntent.getService(this, 0,
                pauseIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, RadioPlayerService.class);
        stopIntent.setAction("STOP");
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 0,
                stopIntent, PendingIntent.FLAG_IMMUTABLE);

        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.drawable.ic_radio);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(streamTitle)
                .setContentText(isPlaying ? getResources().getString(R.string.notification_playing) : getResources().getString(R.string.pause))
//                .setContentText(isPlaying ? "Playing" : "Paused")
                .setSmallIcon(R.drawable.ic_music_note)
                .setLargeIcon(largeIcon)
                .setContentIntent(pendingIntent)
                .addAction(R.drawable.ic_play, "Play", playPendingIntent)
                .addAction(R.drawable.ic_pause, "Pause", pausePendingIntent)
                .addAction(R.drawable.ic_stop, "Stop", stopPendingIntent)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1))
                .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void updateNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0,
                notificationIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent playIntent = new Intent(this, RadioPlayerService.class);
        playIntent.setAction(ACTION_PLAY);
        PendingIntent playPendingIntent = PendingIntent.getService(this, 1,
                playIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent pauseIntent = new Intent(this, RadioPlayerService.class);
        pauseIntent.setAction(ACTION_PAUSE);
        PendingIntent pausePendingIntent = PendingIntent.getService(this, 2,
                pauseIntent, PendingIntent.FLAG_IMMUTABLE);

        Intent stopIntent = new Intent(this, RadioPlayerService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent stopPendingIntent = PendingIntent.getService(this, 3,
                stopIntent, PendingIntent.FLAG_IMMUTABLE);

        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(streamTitle)
//                .setContentText(isPlaying ? "Playing" : "Paused")
                .setContentText(isPlaying ? getResources().getString(R.string.notification_playing) : getResources().getString(R.string.pause))
                .setSmallIcon(R.drawable.ic_radio)
                .setLargeIcon(largeIcon)
                .setContentIntent(pendingIntent)
                .addAction(isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                        isPlaying ? getResources().getString(R.string.pause) : getResources().getString(R.string.play),
                        isPlaying ? pausePendingIntent : playPendingIntent)
                .addAction(R.drawable.ic_stop, getResources().getString(R.string.stop), stopPendingIntent)
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                        .setShowActionsInCompactView(0, 1))
                .build();

        startForeground(NOTIFICATION_ID, notification);
    }

    private void updateNotificationZS() {

        Bitmap notifyIcon = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher_round);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            /// Create or update.

            NotificationChannel channel = new NotificationChannel(CHANNEL_ID,
                    getString(R.string.audio_notification),
                    NotificationManager.IMPORTANCE_LOW);
            channel.enableVibration(false);
            channel.enableLights(true);
            channel.setLightColor(R.color.white);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(channel);
        }

        int icon = R.drawable.ic_pause;
        Intent playbackAction = new Intent(this, RadioPlayerService.class);
        playbackAction.setAction(ACTION_PAUSE);
//        PendingIntent action = PendingIntent.getService(service, 1, playbackAction, 0);
        PendingIntent action;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            action = PendingIntent.getService(this, 1, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            action = PendingIntent.getService(this, 1, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        if (currentState.equals(PlayerState.PAUSED)) {
            icon = R.drawable.ic_play;
            playbackAction.setAction(ACTION_PLAY);
//            action = PendingIntent.getService(service, 2, playbackAction, 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                action = PendingIntent.getService(this, 2, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            } else {
                action = PendingIntent.getService(this, 2, playbackAction, PendingIntent.FLAG_UPDATE_CURRENT);
            }
        }

        Intent stopIntent = new Intent(this, RadioPlayerService.class);
        stopIntent.setAction(ACTION_STOP);
//        PendingIntent stopAction = PendingIntent.getService(service, 3, stopIntent, 0);
        PendingIntent stopAction;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            stopAction = PendingIntent.getService(this, 3, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            stopAction = PendingIntent.getService(this, 3, stopIntent, PendingIntent.FLAG_UPDATE_CURRENT);
        }

        Intent intent = new Intent(this, MainActivity.class);
        Bundle bundle = new Bundle();
        bundle.putStringArray(MainActivity.FRAGMENT_DATA, new String[]{streamUrl});
//        bundle.putSerializable(MainBottomNav.FRAGMENT_CLASS, MainBottomNav.class);
        intent.putExtras(bundle);

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
//        PendingIntent pendingIntent = PendingIntent.getActivity(service, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT);
        PendingIntent pendingIntent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        } else {
            pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_CANCEL_CURRENT);
        }

        NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID);


//        String title = meta != null && meta.getArtist() != null ?
//                meta.getArtist() : getMyContext().getResources().getString(R.string.notification_playing);
//        String subTitle = meta != null && meta.getSong() != null ?
//                meta.getSong() : getMyContext().getResources().getString(R.string.app_name);

        builder.
                setContentTitle(streamTitle)
                .setContentText(getResources().getString(R.string.notification_playing))
                .setLargeIcon(notifyIcon)
                .setContentIntent(pendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setSmallIcon(R.drawable.ic_radio)
                .addAction(icon, getResources().getString(R.string.pause), action)
                .addAction(R.drawable.ic_stop,getResources().getString(R.string.stop), stopAction)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(false)
                .setOngoing(true) // Cant cancel your notification (except NotificationManger.cancel(); )
                .setWhen(System.currentTimeMillis())
                .setColor(ContextCompat.getColor(this, R.color.colorPrimary))
                .setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
//                        .setMediaSession(service.getMediaSession().getSessionToken())
                        .setShowActionsInCompactView(0, 1)
                        .setShowCancelButton(true)
                        .setCancelButtonIntent(stopAction));


        Notification notification = builder.build();


        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        }else {
            startForeground(
                    NOTIFICATION_ID,
                    notification);
        }
    }


    public void cancelNotify() {
        Intent buttonIntent = new Intent(this, MainActivity.class);
        int notificationId = buttonIntent.getIntExtra(CHANNEL_ID, NOTIFICATION_ID);
        NotificationManager manager = (NotificationManager) this. getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(notificationId);
        stopForeground(true);
    }


    @Override
    public void onDestroy() {
        if (metadataTimer != null) {
            metadataTimer.cancel();
            metadataTimer = null;
        }
        if (mediaPlayer != null) {
            mediaPlayer.release();
            mediaPlayer = null;
        }
        isPlaying = false;
        currentState = PlayerState.STOPPED;
        clearNotification();
        super.onDestroy();
    }

    public boolean isPlaying() {
        return isPlaying;
    }
}