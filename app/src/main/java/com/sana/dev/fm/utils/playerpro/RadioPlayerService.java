package com.sana.dev.fm.utils.playerpro;

import static android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
import static com.google.android.exoplayer2.ui.PlayerNotificationManager.ACTION_PAUSE;
import static com.google.android.exoplayer2.ui.PlayerNotificationManager.ACTION_PLAY;
import static com.google.android.exoplayer2.ui.PlayerNotificationManager.ACTION_STOP;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.view.KeyEvent;

import androidx.core.app.NotificationCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.LogUtility;

import java.io.IOException;

public class RadioPlayerService extends Service {
    private static final String TAG = RadioPlayerService.class.getSimpleName();
    private static final String CHANNEL_ID = "radio_playback_channel";
    public static final String ACTION_NOTIFICATION_PERMISSION_REQUIRED =
            "com.sana.dev.fm.utils.playerpro.action.NOTIFICATION_PERMISSION_REQUIRED";
    private static final int NOTIFICATION_ID = 1;

    private MediaSessionCompat mediaSession;
    private MediaPlayer mediaPlayer;
    private boolean isPlaying = false;
    private String streamTitle = "";
    private String streamUrl = ""; // Your stream URL
    private FloatingActionButton playPauseButton;
    private PlayerState currentState = PlayerState.STOPPED;

    private enum PlayerState {
        PLAYING, PAUSED, STOPPED
    }

    // Binder for service connection
    private final IBinder binder = new LocalBinder();

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
        createNotificationChannel();
        initializeMediaSession();
        initializeMediaPlayer();
    }

    private void createNotificationChannel() {
        // Create a notification channel (required for Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Radio Playback",
                    NotificationManager.IMPORTANCE_LOW);

            channel.setDescription("Used for radio playback controls");
            channel.setShowBadge(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            NotificationManager notificationManager =
                    getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void initializeMediaSession() {
        mediaSession = new MediaSessionCompat(this, "RadioPlayerService");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);

        // Add this: Set a MediaButtonReceiver to handle media button intents
        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON);
        mediaButtonIntent.setClass(this, RadioPlayerService.class);
        PendingIntent mediaPendingIntent = PendingIntent.getService(
                this,
                0,
                mediaButtonIntent,
                PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession.setMediaButtonReceiver(mediaPendingIntent);

        // Rest of your code...
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                play();
            }

            @Override
            public void onPause() {
                pause();
            }

            @Override
            public void onStop() {
                stop();
            }
        });
        updatePlaybackState();
    }

    private void initializeMediaPlayer() {
        mediaPlayer = new MediaPlayer();
        mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
        );

        mediaPlayer.setOnPreparedListener(mp -> {
            play();
        });

        mediaPlayer.setOnErrorListener((mp, what, extra) -> {
            handleMediaPlayerError(what, extra);
            return true;
        });
    }

    private boolean handleMediaPlayerError(int what, int extra) {
        // Handle media player errors
        stopSelf();
        return true;
    }

    public void setStreamUrl(String url) {
        this.streamUrl = url;
    }

    public void setStreamTitle(String title) {
        this.streamTitle = title;
        updateNotification();
    }

    // In RadioPlayerService.java
    public void startPlayback() {
        if (mediaPlayer != null) {
            mediaPlayer.reset(); // Reset instead of reinitializing
        } else {
            initializeMediaPlayer();
        }
        try {
            mediaPlayer.setDataSource(streamUrl);
            mediaPlayer.prepareAsync();
        } catch (IOException e) {
            LogUtility.d(TAG, "Error setupProgramProfile : " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void play() {
        if (mediaPlayer != null && !isPlaying) {
            mediaPlayer.start();
            isPlaying = true;
            currentState = PlayerState.PLAYING;
            updatePlaybackState();
            updateNotification();
        }
    }

    public void pause() {
        if (mediaPlayer != null && isPlaying) {
            mediaPlayer.pause();
            isPlaying = false;
            currentState = PlayerState.PAUSED;
            updatePlaybackState();
            updateNotification();
        }
    }

    public void stop() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            mediaPlayer.release();
            mediaPlayer = null;
            isPlaying = false;
            currentState = PlayerState.STOPPED;
            // Clear the MediaSession and notification
            updatePlaybackState();
            stopForeground(true); // Remove foreground state and notification
            stopSelf(); // Terminate the service

//            // Explicitly release MediaSession
//            if (mediaSession != null) {
//                mediaSession.setActive(false);
//                mediaSession.release();
//                mediaSession = null;
//            }
        }
    }



    public void setPlayPauseButton(FloatingActionButton button) {
        this.playPauseButton = button;
        updatePlayPauseButton();
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

    private void updatePlaybackState() {
        PlaybackStateCompat.Builder stateBuilder = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY |
                        PlaybackStateCompat.ACTION_PAUSE |
                        PlaybackStateCompat.ACTION_STOP |
                        PlaybackStateCompat.ACTION_PLAY_PAUSE);

        if (isPlaying) {
            stateBuilder.setState(PlaybackStateCompat.STATE_PLAYING,
                    PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1.0f);
        } else {
            stateBuilder.setState(PlaybackStateCompat.STATE_PAUSED,
                    PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 0.0f);
        }

        mediaSession.setPlaybackState(stateBuilder.build());
        mediaSession.setActive(true);

        updatePlayPauseButton();
    }

    private void updateNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                handleNotificationPermissionDenied();
                return;
            }
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        PendingIntent playPendingIntent = createActionIntent(ACTION_PLAY, 1);
        PendingIntent pausePendingIntent = createActionIntent(ACTION_PAUSE, 2);
        PendingIntent stopPendingIntent = createActionIntent(ACTION_STOP, 3);

        PendingIntent deletePendingIntent = createActionIntent(ACTION_STOP, 4);

        Bitmap largeIcon = BitmapFactory.decodeResource(getResources(),
                R.mipmap.ic_launcher_round);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(streamTitle)
                .setContentText(isPlaying ?
                        getString(R.string.notification_playing) :
                        getString(R.string.pause))
                .setSmallIcon(R.drawable.ic_radio)
                .setLargeIcon(largeIcon)
                .setContentIntent(pendingIntent)
                .setDeleteIntent(deletePendingIntent)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .setOngoing(isPlaying); // Prevents dismissal when playing

        builder.addAction(new NotificationCompat.Action.Builder(
                isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                isPlaying ? getString(R.string.pause) : getString(R.string.play),
                isPlaying ? pausePendingIntent : playPendingIntent
        ).build());

        builder.addAction(new NotificationCompat.Action.Builder(
                R.drawable.ic_stop,
                getString(R.string.stop),
                stopPendingIntent
        ).build());

        builder.setStyle(new androidx.media.app.NotificationCompat.MediaStyle()
                .setShowActionsInCompactView(0, 1)
                .setMediaSession(mediaSession.getSessionToken()));

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            startForeground(NOTIFICATION_ID, builder.build());
        } else {
            startForeground(NOTIFICATION_ID, builder.build(),
                    FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        }
    }


    private PendingIntent createActionIntent(String action, int requestCode) {
        Intent intent = new Intent(this, RadioPlayerService.class);
        intent.setAction(action);
        return PendingIntent.getService(
                this,
                requestCode,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void handleNotificationPermissionDenied() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(getString(R.string.app_name))
                .setContentText(getString(R.string.notification_permission_required))
                .setSmallIcon(R.drawable.ic_radio)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            startForeground(NOTIFICATION_ID, builder.build());
        } else {
            startForeground(NOTIFICATION_ID, builder.build(),
                    FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        }

        Intent intent = new Intent(ACTION_NOTIFICATION_PERMISSION_REQUIRED);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            // Extract the media button event
            KeyEvent keyEvent = intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
            if (keyEvent != null && keyEvent.getAction() == KeyEvent.ACTION_DOWN) {
                switch (keyEvent.getKeyCode()) {
                    case KeyEvent.KEYCODE_MEDIA_PLAY:
                        play();
                        break;
                    case KeyEvent.KEYCODE_MEDIA_PAUSE:
                        pause();
                        break;
                    case KeyEvent.KEYCODE_MEDIA_STOP:
                        stop();
                        break;
                }
            }
        }
        // Rest of your existing code...
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        stop(); // Ensure cleanup
        super.onDestroy();
    }

    public boolean isPlaying() {
        return isPlaying;
    }
}
