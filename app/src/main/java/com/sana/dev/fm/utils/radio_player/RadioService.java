package com.sana.dev.fm.utils.radio_player;

import android.Manifest;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.media.AudioManager;
import android.net.wifi.WifiManager;
import android.os.Binder;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaControllerCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.telephony.PhoneStateListener;
import android.telephony.TelephonyManager;
import android.text.TextUtils;

import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.media.session.MediaButtonReceiver;

import com.google.android.exoplayer2.ExoPlayer;
import com.google.android.exoplayer2.PlaybackParameters;
import com.google.android.exoplayer2.Player;
import com.google.android.exoplayer2.trackselection.DefaultTrackSelector;
import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.radio_player.metadata.Metadata;
import com.sana.dev.fm.utils.radio_player.metadata.ShoutcastMetadataListener;
import com.sana.dev.fm.utils.radio_player.parser.AlbumArtGetter;


/*https://github.com/tutsplus/background-audio-in-android-with-mediasessioncompat/blob/master/app/src/main/java/com/tutsplus/backgroundaudio/BackgroundAudioService.java*/
public class RadioService extends Service implements Player.Listener, AudioManager.OnAudioFocusChangeListener, ShoutcastMetadataListener {

    public static final String ACTION_PLAY = "com.sana.dev.fm.utils.radio_player.ACTION_PLAY";
    public static final String ACTION_PAUSE = "com.sana.dev.fm.utils.radio_player.ACTION_PAUSE";
    public static final String ACTION_STOP = "com.sana.dev.fm.utils.radio_player.ACTION_STOP";

    private final IBinder iBinder = new LocalBinder();

    private Handler handler;
    private ExoPlayer exoPlayer;
    private MediaSessionCompat mediaSession;
    private MediaControllerCompat.TransportControls transportControls;

    private boolean onGoingCall = false;
    private TelephonyManager telephonyManager;

    private WifiManager.WifiLock wifiLock;

    private AudioManager audioManager;

    private MediaNotificationManager notificationManager;

    private boolean serviceInUse = false;

    private String status;

    private String strAppName;
    private String strLiveBroadcast;
    //    private String streamUrl;
    Metadata metadata;

    public class LocalBinder extends Binder {
        public RadioService getService() {
            return RadioService.this;
        }
    }

    private BroadcastReceiver becomingNoisyReceiver = new BroadcastReceiver() {

        @Override
        public void onReceive(Context context, Intent intent) {

            pause();

        }

    };

    private PhoneStateListener phoneStateListener = new PhoneStateListener() {

        @Override
        public void onCallStateChanged(int state, String incomingNumber) {

            if (state == TelephonyManager.CALL_STATE_OFFHOOK
                    || state == TelephonyManager.CALL_STATE_RINGING) {

                if (!isPlaying()) return;

                onGoingCall = true;
                stop();

            } else if (state == TelephonyManager.CALL_STATE_IDLE) {

                if (!onGoingCall) return;

                onGoingCall = false;
                resume();

            }
        }

    };

    private MediaSessionCompat.Callback mediasSessionCallback = new MediaSessionCompat.Callback() {
        @Override
        public void onPause() {
            super.onPause();

            pause();
        }

        @Override
        public void onStop() {
            super.onStop();

            stop();

            notificationManager.cancelNotify();
        }

        @Override
        public void onPlay() {
            super.onPlay();

            resume();
        }
    };

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {

        serviceInUse = true;

        return iBinder;

    }

    @Override
    public void onCreate() {
        super.onCreate();

        strAppName = getResources().getString(R.string.app_name);
        strLiveBroadcast = getResources().getString(R.string.notification_playing);

        onGoingCall = false;

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        notificationManager = new MediaNotificationManager(this);

        wifiLock = ((WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE))
                .createWifiLock(WifiManager.WIFI_MODE_FULL, "mcScPAmpLock");

        ComponentName name = new ComponentName(getApplicationContext(), MediaButtonReceiver.class);
//        mediaSession = new MediaSessionCompat(this, getClass().getSimpleName(), name, null);

        Intent mediaButtonIntent = new Intent(Intent.ACTION_MEDIA_BUTTON);
        PendingIntent pendingItent = PendingIntent.getBroadcast(
                this,
                0, mediaButtonIntent,
                PendingIntent.FLAG_IMMUTABLE
        );
        mediaSession = new MediaSessionCompat(this, getClass().getSimpleName(), null, pendingItent);
        mediaSession.setActive(true);


        transportControls = mediaSession.getController().getTransportControls();
        mediaSession.setActive(true);
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setMetadata(new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, "...")
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, strAppName)
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, strLiveBroadcast)
                .build());
        mediaSession.setCallback(mediasSessionCallback);

        telephonyManager = (TelephonyManager) getSystemService(Context.TELEPHONY_SERVICE);
//        telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);

        // for API 31+: you need to first check for READ_PHONE_STATE permission to be able to listen to LISTEN_CALL_STATE
        if (Build.VERSION.SDK_INT >= 31)
        {
            if(ContextCompat.checkSelfPermission(this, Manifest.permission.READ_PHONE_STATE) == PackageManager.PERMISSION_GRANTED)
                telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);
        }
        else // no permission needed
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_CALL_STATE);

        handler = new Handler();
        DefaultTrackSelector trackSelector = new DefaultTrackSelector(this);
//        exoPlayer = ExoPlayerFactory.newSimpleInstance(getApplicationContext(), trackSelector);
        exoPlayer = new ExoPlayer.Builder(this).build();

        exoPlayer.addListener(this);
        exoPlayer.setPlayWhenReady(true);

        registerReceiver(becomingNoisyReceiver, new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY));

        status = PlaybackStatus.IDLE;

    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        String action = intent.getAction();

        if (TextUtils.isEmpty(action))
            return START_NOT_STICKY;

        int result = audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        if (result != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {

            stop();

            return START_NOT_STICKY;
        }

        if (action.equalsIgnoreCase(ACTION_PLAY)) {

            transportControls.play();

        } else if (action.equalsIgnoreCase(ACTION_PAUSE)) {

            transportControls.pause();

        } else if (action.equalsIgnoreCase(ACTION_STOP)) {

            transportControls.stop();

        }

        return START_NOT_STICKY;
    }

    @Override
    public boolean onUnbind(Intent intent) {

        serviceInUse = false;

        if (status.equals(PlaybackStatus.IDLE))
            stopSelf();

        return super.onUnbind(intent);
    }

    @Override
    public void onRebind(final Intent intent) {

        serviceInUse = true;

    }

    @Override
    public void onDestroy() {

        pause();

        exoPlayer.release();
        exoPlayer.removeListener(this);

        if (telephonyManager != null)
            telephonyManager.listen(phoneStateListener, PhoneStateListener.LISTEN_NONE);

        notificationManager.cancelNotify();

        mediaSession.release();

        unregisterReceiver(becomingNoisyReceiver);

        super.onDestroy();

    }

    @Override
    public void onAudioFocusChange(int focusChange) {

        switch (focusChange) {
            case AudioManager.AUDIOFOCUS_GAIN:

                exoPlayer.setVolume(0.8f);

                resume();

                break;

            case AudioManager.AUDIOFOCUS_LOSS:

                stop();

                break;

            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:

                if (isPlaying()) pause();

                break;

            case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:

                if (isPlaying())
                    exoPlayer.setVolume(0.1f);

                break;
        }

    }

    @Override
    public void onPlayerStateChanged(boolean playWhenReady, int playbackState) {

        switch (playbackState) {
            case ExoPlayer.STATE_BUFFERING:
                status = PlaybackStatus.LOADING;
                break;
            case ExoPlayer.STATE_ENDED:
                status = PlaybackStatus.STOPPED;
                break;
            case ExoPlayer.STATE_IDLE:
                status = PlaybackStatus.IDLE;
                break;
            case ExoPlayer.STATE_READY:
                status = playWhenReady ? PlaybackStatus.PLAYING : PlaybackStatus.PAUSED;
                break;
            default:
                status = PlaybackStatus.IDLE;
                break;
        }

        if (!status.equals(PlaybackStatus.IDLE))
            notificationManager.startNotify(status);

        StaticEventDistributor.onEvent(status);
    }

    public void onRepeatModeChanged(int repeatMode) {

    }

    @Override
    public void onShuffleModeEnabledChanged(boolean shuffleModeEnabled) {

    }



    @Override
    public void onLoadingChanged(boolean isLoading) {

    }



    @Override
    public void onPositionDiscontinuity(int reason) {

    }


    @Override
    public void onPlaybackParametersChanged(PlaybackParameters playbackParameters) {

    }




    public Metadata getStreamUrl() {
        return metadata;
    }

    public void play(String url) {

        if (wifiLock != null && !wifiLock.isHeld()) {
            wifiLock.acquire();
        }


        exoPlayer.setPlayWhenReady(true);
    }

    public int getAudioSessionId() {
        return exoPlayer.getAudioSessionId();
    }

    public void resume() {
        if (metadata != null && metadata.getUrl() != null)
            play(metadata.getUrl());
    }

    public void pause() {
        exoPlayer.setPlayWhenReady(false);
        audioManager.abandonAudioFocus(this);
        wifiLockRelease();
    }

    public void stop() {
        exoPlayer.stop();
        audioManager.abandonAudioFocus(this);
        wifiLockRelease();
        notificationManager.cancelNotify();
    }

    String previousUrl;

    public void playOrPause(Metadata newMetadata) {

        this.metadata = newMetadata;

        if (previousUrl == null) {
            previousUrl = this.metadata.getUrl();

            if (!isPlaying()) {
                play(this.metadata.getUrl());
            } else {
                pause();
            }
        } else {
            if (isPlaying() && this.metadata.getUrl().equals(previousUrl)) {
                pause();
            } else {
                play(this.metadata.getUrl());
            }
        }

        previousUrl = this.metadata.getUrl();

    }


    public String getStatus() {
        return status;
    }

    @Override
    public void onMetadataReceived(final Metadata data) {
        final String artistAndSong = data.getArtist() + " " + data.getSong();
        AlbumArtGetter.getImageForQuery(artistAndSong, new AlbumArtGetter.AlbumCallback() {
            @Override
            public void finished(Bitmap art) {
                notificationManager.startNotify(art, data);
                //Post meta to Fragments
                StaticEventDistributor.onMetaDataReceived(data, art);
            }
        }, this);
    }

    public Metadata getMetaData() {
        return notificationManager.getMetaData();
    }

    public MediaSessionCompat getMediaSession() {

        return mediaSession;
    }

    public boolean isPlaying() {

        return this.status.equals(PlaybackStatus.PLAYING);
    }

    private void wifiLockRelease() {

        if (wifiLock != null && wifiLock.isHeld()) {

            wifiLock.release();

        }

    }
}