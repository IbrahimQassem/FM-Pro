package com.sana.dev.fm.ui.activity.player;


import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Binder;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;

import com.google.gson.Gson;
import com.sana.dev.fm.ui.activity.appuser.VerificationPhone;
import com.sana.dev.fm.utils.LogUtility;

import java.util.List;


public class MusicService extends Service implements
        MediaPlayer.OnPreparedListener, MediaPlayer.OnErrorListener,
        MediaPlayer.OnCompletionListener, PlayerInterface,
        AudioManager.OnAudioFocusChangeListener {

    private static final String TAG = MusicService.class.getSimpleName();
    private static final int NOTIFICATION_ID = 12302;

    private MediaPlayer player;
    private SongModel currentSong;
    private int currentSongPosition;
    Callback callback;
    private final IBinder musicBind = new MusicBinder();
    private AudioManager audioManager;
    private boolean audioFocusState = false;
    PlayerThread mPlayerThread;

    private boolean firstTime = true;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return musicBind;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        player = new MediaPlayer();
        mPlayerThread = new PlayerThread();
        mPlayerThread.start();
        initMusicService();
        Log.i(TAG, "onCreate Service");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        NotificationManager mNotificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
//        mNotificationManager.notify();
        if (intent != null)
        switch (intent.getAction()) {
//            case "":
//                mNotificationManager.notify(NOTIFICATION_ID,NotificationHandler.createNotification(this, currentSong));
//                break;
            case "action.prev":
                playPrev();
                mNotificationManager.notify(NOTIFICATION_ID, NotificationHandler.createNotification(this, currentSong, true));
                break;
            case "action.pause":
                pause();
                mNotificationManager.notify(NOTIFICATION_ID, NotificationHandler.createNotification(this, currentSong, false));
                break;
            case "action.play":
                mNotificationManager.notify(NOTIFICATION_ID, NotificationHandler.createNotification(this, currentSong, true));
                if (player != null) {
                    start();
                } else {
                    initMusicService();
                    start();
                }
                break;
            case "action.next":
                playNext();
                mNotificationManager.notify(NOTIFICATION_ID, NotificationHandler.createNotification(this, currentSong, true));
                break;
            case "action.stop":
                stop();
                stopForeground(true);
                stopSelf();
                break;
        }
        return START_STICKY;
    }

    public void initMusicService() {
        if (player == null) return;
        player.setOnPreparedListener(this);
        player.setOnCompletionListener(this);
        player.setOnErrorListener(this);
        player.setWakeMode(getApplicationContext(),
                PowerManager.PARTIAL_WAKE_LOCK);
        player.setAudioStreamType(AudioManager.STREAM_MUSIC);
        restoreSong();
        if (!audioFocusState) {
            Log.i(TAG, "Focus before is: " + audioFocusState);
            requestAudioFocusManager();
            Log.i(TAG, "Focus after is: " + audioFocusState);
        }
    }

    private void restoreSong() {
        long currentSongId = MusicPreference.get(this).getLastPlayedSongId();
        if (currentSongId != 0) {
            currentSong = SongDataLab.get(this).getSong(currentSongId);
        } else {
            currentSong = SongDataLab.get(this).getRandomSong();
        }
        long currentSongDuration = MusicPreference.get(this).getLastPlayedSongDuration();
    }

    @Override
    public void onCompletion(MediaPlayer mediaPlayer) {
        if (callback != null) {
            callback.onCompletion(currentSong);
        }
    }

    // if the audio focus changes, i.e whether
    // the user switch to another apps or new notification sound popup
    // or any video gets called
    @Override
    public void onAudioFocusChange(int i) {
        try {
            switch (i) {
                // if apps gets audio focus
                case AudioManager.AUDIOFOCUS_GAIN:
                    if (player == null) initMusicService();
                    else if (!player.isPlaying()) player.start();
                    player.setVolume(1.0f, 1.0f);
                    break;
                // if loss focus for an less time: stop and release player
                case AudioManager.AUDIOFOCUS_LOSS:
                    try {
                        if (player != null) player.stop();
                        player.release();
                        player = null;
                    } catch (Exception e) {
                        LogUtility.e(LogUtility.tag(MusicService.class), e.toString());
                    }
                    break;
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    // Lost focus for a short time, but we have to stop
                    // playback. We don't release the player player because playback
                    // is likely to resume
                    if (player.isPlaying()) player.pause();
                    break;
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    // Lost focus for a short time, but it's ok to keep playing
                    // at an attenuated level
                    if (player.isPlaying()) player.setVolume(0.1f, 0.1f);
                    break;
            }
        }catch (Exception e){
            LogUtility.e("TAG","on audio"+e);
        }
    }

    private void requestAudioFocusManager() {
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        int result = audioManager.requestAudioFocus(this, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
        if (result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            audioFocusState = true;
        } else {
            audioFocusState = false;
        }

    }

    //remove the audio focus
    private boolean removeAudioFocus() {
        return AudioManager.AUDIOFOCUS_REQUEST_GRANTED == audioManager.abandonAudioFocus(this);
    }

    public class MusicBinder extends Binder {
        public MusicService getService() {
            return MusicService.this;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy Music Service");
        MusicPreference.get(this).setCurrentSongStatus(currentSong.getId(), player.getCurrentPosition());
        player.stop();
        player.release();
    }

    @Override
    public boolean onError(MediaPlayer mediaPlayer, int i, int i1) {
        return false;
    }

    @Override
    public void onPrepared(MediaPlayer mediaPlayer) {
        mediaPlayer.start();
    }

    // Overriding the Player Interface methods
    @Override
    public void start() {
        if (firstTime) {
            play(currentSong);
            firstTime = false;
        } else {
            if (player != null)
            player.start();
        }
    }


    @Override
    public void play(long songId) {
        player.reset();
        SongModel playSong = SongDataLab.get(this).getSong(songId);
        play(playSong);
    }

    @Override
    public void play(SongModel song) {
        mPlayerThread.play(song);
//        currentSong = song;
//        if (player != null) {
//            player.reset();
//            try {
//                player.setDataSource(song.getData());
//                Log.i(TAG, song.getBookmark() + "");
//                player.prepareAsync();
//                this.callback.onTrackChange(song);
//            } catch (Exception e) {
//                Log.e(TAG, "Error playing from data source", e);
//            }
//        }
    }

    @Override
    public void pause() {
        if (player != null) {
            player.pause();
            callback.onPause();
        }
    }

    @Override
    public void stop() {
        if (player != null) {
            player.stop();
        }
    }

    @Override
    public boolean isPlaying() {
        if (player != null) {
            return player.isPlaying();
        }
        return false;
    }

    @Override
    public int getCurrentStreamPosition() {
        if (player != null) {
            return player.getCurrentPosition();
        }
        return 0;
    }

    @Override
    public long getDuration() {
        if (player != null) {
            return player.getDuration();
        } else {
            return 0;
        }
    }

    @Override
    public void seekTo(int position) {
        player.seekTo(position);
    }

    @Override
    public void setCallback(Callback callback) {
        this.callback = callback;
    }

    // Services Helper Methods
    public void setSong(int songIndex) {
        currentSongPosition = songIndex;
    }

    public String getCurrentSongName() {
        return currentSong.getTitle();
    }

    public SongModel getCurrentSong() {
        return currentSong;
    }

    public void playNext() {
//        play(currentSongPosition + 1);
        play(SongDataLab.get(this).getNextSong(currentSong));
    }

    public void playPrev() {

//        play(currentSongPosition - 1);

        play(SongDataLab.get(this).getPreviousSong(currentSong));

    }

    public List<AlbumModel> getAlbums() {
        return SongDataLab.get(this).getAlbums();
    }

    public List<ArtistModel> getArtists() {
        return SongDataLab.get(this).getArtists();
    }

    public List<SongModel> getSongs() {
        return SongDataLab.get(this).getSongs();
    }

    // switch the current service to the foreground by creating the
    // notifications
    public void toForeground() {
        startForeground(NOTIFICATION_ID, NotificationHandler.createNotification(this, currentSong, true));
        Log.d(TAG, "toForeground() called");
    }

    // kill the foreground notification, so that service
    // can run in background
    public void toBackground() {
        stopForeground(true);
    }


    public class PlayerThread extends Thread {
        private Handler mHandler;

        @Override
        public void run() {
            super.run();
            Looper.prepare();
            mHandler = new Handler();
            Looper.loop();
        }

        public void play(final SongModel song) {
            currentSong = song;

            mHandler.post(new Runnable() {
                @Override
                public void run() {
                    if (player != null) {
                        player.reset();
                        try {
                            player.setDataSource(song.getData());
//                            player.setDataSource("http://www.dev2qa.com/demo/media/test.mp3");
                            LogUtility.e(LogUtility.TAG, " song : " + new Gson().toJson(song));

                            player.prepareAsync();
                            MusicService.this.callback.onTrackChange(song);

                        } catch (Exception e) {
                            LogUtility.e(LogUtility.TAG, "Error playing from data source", e);
                        }
                    }
                }
            });
        }

        public void prepareNext() {

        }

        public void exit() {
            mHandler.getLooper().quit();
        }
    }


}