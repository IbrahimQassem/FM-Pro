package com.sana.dev.fm.utils.playerpro;

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
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.widget.Toast;

import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import androidx.palette.graphics.Palette;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.my_firebase.StationManager;

import java.io.IOException;

public class RadioPlayerService extends Service {
    private static final String TAG = RadioPlayerService.class.getSimpleName();
    public static final String ACTION_NOTIFICATION_PERMISSION_REQUIRED = "com.sana.dev.fm.utils.playerpro.action.NOTIFICATION_PERMISSION_REQUIRED";
    private static final int NOTIFICATION_ID = 1;
    private MediaSessionCompat mediaSession;
    private MediaPlayer mediaPlayer;
    private boolean isPlaying = false;
    private RadioInfo streamRadio;
    private FloatingActionButton playPauseButton;
    private PlayerState currentState = PlayerState.STOPPED;
    private static final String MEDIA_SESSION_TAG = "com.sana.dev.fm.MEDIA_SESSION";
    private static final String NOTIFICATION_CHANNEL_ID = "media_playback_channel";
    private NotificationManager notificationManager;
    private NotificationCompat.Builder notificationBuilder;

    // Log analytics
    private StationManager stationManager;
    UserModel userModel;

    // When playback starts
    private long playbackStartElapsed;
    private long totalElapsedTime;

    public enum PlayerState {
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
        stationManager = new StationManager();
        userModel = PreferencesManager.getInstance().getUserSession();
        createNotificationChannel();
        initializeMediaSession();
        initializeMediaPlayer();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    NOTIFICATION_CHANNEL_ID,
                    "Media Playback",
                    NotificationManager.IMPORTANCE_LOW
            );

            channel.setDescription("Controls for the radio player");
            channel.setShowBadge(false);
            channel.enableLights(false);
            channel.enableVibration(false);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

            notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }

    private void initializeMediaSession() {
        mediaSession = new MediaSessionCompat(this, "RadioPlayerService");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS |
                MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);

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
            LogUtility.e(TAG, "MediaPlayer error: what=" + what + ", extra=" + extra);
//            Toast.makeText(this, "MediaPlayer error: what=" + what + ", extra=" + extra, Toast.LENGTH_LONG).show();
            Toast.makeText(this, String.format("%s", getResources().getString(R.string.msg_no_stream, streamRadio.getName())), Toast.LENGTH_SHORT).show();
            stop(); // Stop and clean up on error
            return true;
        });
    }

    public void setRadioStreamInfo(RadioInfo radioInfo) {
        this.streamRadio = radioInfo;
        updateNotification();
    }

//    public void startPlayback() {
//        try {
//            if (mediaPlayer == null) {
//                initializeMediaPlayer();
//            }
//            mediaPlayer.setDataSource(streamUrl);
//            mediaPlayer.prepareAsync();
////            play();
//        } catch (IOException e) {
//            e.printStackTrace();
//        }
//    }

    public void startPlayback() {
        if (mediaPlayer == null) {
            initializeMediaPlayer(); // Initialize if null
        } else {
            mediaPlayer.reset(); // Reset if already initialized
        }

        try {
            if (streamRadio == null || streamRadio.getStreamUrl().isEmpty()) {
                LogUtility.w(TAG, "Stream URL is null or empty");
                return;
            }

            mediaPlayer.setDataSource(streamRadio.getStreamUrl()); // Set the data source
            mediaPlayer.prepareAsync(); // Prepare asynchronously
        } catch (IOException e) {
            LogUtility.e(TAG, "Error setting data source: " + e.getMessage());
            e.printStackTrace();
            stop(); // Stop and clean up on error
        } catch (Exception e) {
            LogUtility.e(TAG, "IllegalStateException: " + e.getMessage());
            e.printStackTrace();
            stop(); // Stop and clean up on error
        }
    }

    private void play() {
        if (mediaPlayer != null && !isPlaying) {
            mediaPlayer.start();
            isPlaying = true;
//            notificationLayout.setImageViewResource(R.id.btn_play, R.drawable.ic_pause);
            currentState = PlayerState.PLAYING;
            updatePlaybackState();
            updateNotification();
            // When a user starts listening to a station:
            playbackStartElapsed = SystemClock.elapsedRealtime();

            String userId = userModel != null && userModel.getUserId() != null ? userModel.getUserId() : null;
            String radioId = streamRadio != null && streamRadio.getRadioId() != null ? streamRadio.getRadioId() : " ";
            stationManager.addListener(radioId, userId);
        }
    }

    public void pause() {
        if (mediaPlayer != null && isPlaying) {
            mediaPlayer.pause();
            isPlaying = false;
//            notificationLayout.setImageViewResource(R.id.btn_play, R.drawable.ic_play);
            currentState = PlayerState.PAUSED;
            updatePlaybackState();
            updateNotification();
            totalElapsedTime += SystemClock.elapsedRealtime() - playbackStartElapsed;
        }
    }

    public void stop() {
        if (mediaPlayer != null) {
            mediaPlayer.stop();
            mediaPlayer.release();
            mediaPlayer = null;
            isPlaying = false;
            currentState = PlayerState.STOPPED;
            updatePlaybackState();
            stopForeground(true);
            stopSelf();

            // When a user stops listening, calculate the listen duration and update:
            // When playback stops
            long listenTime = calculateCurrentListenTime();/// 1000; // Convert to seconds

            String userId = userModel != null && userModel.getUserId() != null ? userModel.getUserId() : null;
            String newRadioId = streamRadio != null && streamRadio.getRadioId() != null ? streamRadio.getRadioId() : " ";
            stationManager.updateListenTime(newRadioId, userId, listenTime);

            //                        // When a user skips a song or marks a station as a favorite:
//                        stationManager.incrementSkips(newRadioId,userId);
//                        stationManager.incrementFavorites(newRadioId,userId);
//                        if (lastStartTime > 0) {
//                            totalListenTime += (System.currentTimeMillis() - lastStartTime);
//                            lastStartTime = 0;
//                        }
        }
    }

    public long calculateCurrentListenTime() {
        if (isPlaying) {
            return totalElapsedTime + (SystemClock.elapsedRealtime() - playbackStartElapsed);
        }
        return totalElapsedTime;
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

   /* private void updateNotificationZZ() {
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

        String streamTitle = streamRadio != null && streamRadio.getName() != null ? streamRadio.getName() + "-" + streamRadio.getChannelFreq() : " ";
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
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

        startForeground(NOTIFICATION_ID, builder.build());
    }*/

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
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setContentTitle(getString(R.string.app_name))
                .setContentText(getString(R.string.notification_permission_required))
                .setSmallIcon(R.drawable.ic_radio)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        startForeground(NOTIFICATION_ID, builder.build());

        Intent intent = new Intent(ACTION_NOTIFICATION_PERMISSION_REQUIRED);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
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
                    stop();
                    break;
            }
        }
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        stop();
        super.onDestroy();
    }

    public boolean isPlaying() {
        return isPlaying;
    }

    public PlayerState getCurrentState() {
        return currentState;
    }

    // ... (keep existing constants)

    private void updateNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                handleNotificationPermissionDenied();
                return;
            }
        }

        // Create intent for clicking the notification
        Intent contentIntent = new Intent(this, MainActivity.class);
        PendingIntent contentPendingIntent = PendingIntent.getActivity(
                this,
                0,
                contentIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Create media style
        androidx.media.app.NotificationCompat.MediaStyle mediaStyle = new androidx.media.app.NotificationCompat.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2); // Show previous, play/pause, next buttons

        // Create action buttons
        NotificationCompat.Action previousAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_action_prev,
                "Previous",
                createActionIntent("previous", 1)
        ).build();

        NotificationCompat.Action playPauseAction = new NotificationCompat.Action.Builder(
                isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                isPlaying ? getString(R.string.pause) : getString(R.string.play),
                createActionIntent(isPlaying ? "pause" : "play", 2)
        ).build();

        NotificationCompat.Action nextAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_action_next,
                "Next",
                createActionIntent("next", 3)
        ).build();

        // Build the notification
        notificationBuilder = new NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
                .setStyle(mediaStyle)
                .setSmallIcon(R.drawable.ic_radio) // Replace with your icon
                .setLargeIcon(getCurrentArtwork())
                .setContentTitle(streamRadio != null ? streamRadio.getName() + " " + streamRadio.getChannelFreq() : "")
                .setContentText(streamRadio != null ? streamRadio.getSlogan() : "")
                .setColorized(true)
                .setColor(getBackgroundColor())
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(contentPendingIntent)
                .setOngoing(isPlaying)
//                .addAction(previousAction)
                .addAction(playPauseAction);
//                .addAction(nextAction);

        // Show the notification
        startForegroundService();
    }

    private Bitmap getCurrentArtwork() {
        if (streamRadio != null && streamRadio.getStreamUrl() != null) {
            // Implement artwork loading using Glide or similar library
            try {
                return Glide.with(this)
                        .asBitmap()
                        .load(streamRadio.getLogo())
                        .placeholder(R.drawable.logo_app)
                        .diskCacheStrategy(DiskCacheStrategy.ALL)
                        .submit()
                        .get();
            } catch (Exception e) {
                return BitmapFactory.decodeResource(getResources(), R.drawable.logo_app);
            }
        }
        return BitmapFactory.decodeResource(getResources(), R.drawable.logo_app);
    }

    private int getBackgroundColor() {
        // Extract dominant color from artwork
        Bitmap artwork = getCurrentArtwork();
        if (artwork != null) {
            Palette palette = Palette.from(artwork).generate();
            return palette.getDominantColor(ContextCompat.getColor(this, R.color.default_notification_color));
        }
        return ContextCompat.getColor(this, R.color.default_notification_color);
    }

    private void startForegroundService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notificationBuilder.build(),
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notificationBuilder.build());
        }
    }

    private void updateNotificationPlayState() {
        if (notificationBuilder != null) {
            // Update play/pause button
            notificationBuilder.mActions.set(1, new NotificationCompat.Action.Builder(
                    isPlaying ? R.drawable.ic_pause : R.drawable.ic_play,
                    isPlaying ? "Pause" : "Play",
                    createActionIntent(isPlaying ? "pause" : "play", 2)
            ).build());

            // Update notification
            notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
        }
    }
}
