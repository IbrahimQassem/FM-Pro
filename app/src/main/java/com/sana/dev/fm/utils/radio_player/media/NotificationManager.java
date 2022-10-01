package com.sana.dev.fm.utils.radio_player.media;//package com.sana.dev.fm.sheard.radio_player.media;
//
//
//import android.app.Notification;
//import android.app.NotificationChannel;
//import android.app.PendingIntent;
//import android.app.Service;
//import android.content.Context;
//import android.content.Intent;
//import android.graphics.Bitmap;
//import android.graphics.drawable.Drawable;
//import android.os.Build;
//import android.os.Bundle;
//import android.os.Handler;
////import android.support.v4.app.NotificationCompat;
//import android.widget.RemoteViews;
//
//import androidx.core.app.NotificationCompat;
//
//import com.sana.dev.fm.R;
//import com.sana.dev.fm.model.TrackObject;
//import com.sana.dev.fm.sheard.radio_player.MediaNotificationManager;
//import com.sana.dev.fm.sheard.radio_player.NotificationConfig;
//import com.sana.dev.fm.sheard.radio_player.PlaybackService;
//
////import com.sherdle.universal.R;
////import com.sherdle.universal.providers.radio.player.MediaNotificationManager;
////import com.sherdle.universal.providers.soundcloud.api.object.TrackObject;
////import com.sherdle.universal.providers.soundcloud.helpers.SoundCloudArtworkHelper;
////import com.squareup.picasso.Picasso;
////import com.squareup.picasso.Target;
//
///**
// * Handle player notification behaviour.
// */
//final class NotificationManager {
//
//    /**
//     * This request code will be pass to the player activity in order to identify the start
//     * after user pressed the notification.
//     */
//    static final int REQUEST_DISPLAYING_CONTROLLER = 0x42004200;
//
//    /**
//     * Notification ID.
//     */
//    private static final int NOTIFICATION_ID = 0x00000042;
//
//    /**
//     * Playback pending intent request code.
//     */
//    private static final int REQUEST_CODE_PLAYBACK = 0x00000010;
//
//    /**
//     * Next track pending intent request code.
//     */
//    private static final int REQUEST_CODE_NEXT = 0x00000020;
//
//    /**
//     * Previous track pending intent request code.
//     */
//    private static final int REQUEST_CODE_PREVIOUS = 0x00000030;
//
//    /**
//     * Clear pending intent request code.
//     */
//    private static final int REQUEST_CODE_CLEAR = 0x00000040;
//
//    /**
//     * Singleton pattern.
//     */
//    private static NotificationManager sInstance;
//
//    /**
//     * Handler running on main thread to perform change on notification ui.
//     */
//    private Handler mMainThreadHandler;
//
//    /**
//     * Id of the track displayed in the notification.
//     */
//    private long mTrackId;
//
//    /**
//     * Builder used to build notification.
//     */
//    private NotificationCompat.Builder mNotificationBuilder;
//
//    /**
//     * {@link RemoteViews} set to the notification.
//     */
//    private RemoteViews mNotificationView;
//
//    /**
//     * {@link RemoteViews} set as expanded notification content.
//     */
//    private RemoteViews mNotificationExpandedView;
//
//    /**
//     * System service to manage notification.
//     */
//    private android.app.NotificationManager mNotificationManager;
//
//    /**
//     * Pending intent set to the playback button.
//     */
//    private PendingIntent mTogglePlaybackPendingIntent;
//
//    /**
//     * Pending intent set to the next button.
//     */
//    private PendingIntent mNextPendingIntent;
//
//    /**
//     * Pending intent set to the previous button.
//     */
//    private PendingIntent mPreviousPendingIntent;
//
//    /**
//     * Pending intent set to clear the player.
//     */
//    private PendingIntent mClearPendingIntent;
//
//    /**
//     * Notification configuration.
//     */
//    private NotificationConfig mNotificationConfig;
//
//    /**
//     * Encapsulate player notification behaviour.
//     *
//     * @param context context used to instantiate internal component.
//     */
//    private NotificationManager(Context context) {
//
//        mTrackId = -1;
//
//        mMainThreadHandler = new Handler(context.getApplicationContext().getMainLooper());
//
//        mNotificationManager = ((android.app.NotificationManager)
//                context.getSystemService(Context.NOTIFICATION_SERVICE));
//
//        // initialize actions' PendingIntents.
//        initializePendingIntent(context);
//    }
//
//    /**
//     * Encapsulate player notification behaviour.
//     *
//     * @param context context used to instantiate internal component.
//     * @return unique instance of the notification manager.
//     */
//    public static NotificationManager getInstance(Context context) {
//        if (sInstance == null) {
//            sInstance = new NotificationManager(context);
//        }
//        return sInstance;
//    }
//
//    /**
//     * Set the configuration for the playback notification.
//     *
//     * @param config notification config.
//     */
//    public void setNotificationConfig(NotificationConfig config) {
//        mNotificationConfig = config;
//    }
//
//    /**
//     * Post a notification displaying the given track in the status bare.
//     *
//     * @param service  service started as foreground if no dismissible.
//     * @param track    track displayed.
//     * @param isPaused true if the current player is paused. Then play action will be displayed.
//     *                 Otherwise, pause action will be displayed.
//     */
//    public void notify(final Service service, final TrackObject track, boolean isPaused) {
//
//        if (mNotificationBuilder == null) {
//            initNotificationBuilder(service);
//            createNotificationChannel(service);
//        }
//
//        // set the title
//        mNotificationView.setTextViewText(R.id.simple_sound_cloud_notification_title, track.getUsername());
//        mNotificationView.setTextViewText(R.id.simple_sound_cloud_notification_subtitle, track.getTitle());
//        mNotificationExpandedView.setTextViewText(R.id.simple_sound_cloud_notification_title, track.getUsername());
//        mNotificationExpandedView.setTextViewText(R.id.simple_sound_cloud_notification_subtitle, track.getTitle());
//
//        // set the right icon for the toggle playback action.
//        if (isPaused) {
//            mNotificationView.setImageViewResource(
//                    R.id.simple_sound_cloud_notification_play,
//                    R.drawable.ic_play_white
//            );
//            mNotificationExpandedView.setImageViewResource(
//                    R.id.simple_sound_cloud_notification_play,
//                    R.drawable.ic_play_white
//            );
//        } else {
//            mNotificationView.setImageViewResource(
//                    R.id.simple_sound_cloud_notification_play,
//                    R.drawable.ic_pause_white
//            );
//            mNotificationExpandedView.setImageViewResource(
//                    R.id.simple_sound_cloud_notification_play,
//                    R.drawable.ic_pause_white
//            );
//        }
//
//        service.startForeground(NOTIFICATION_ID, buildNotification());
//
//        // since toggle playback is often pressed for the same track, only load the artwork when a
//        // new track is passed.
//        long newTrackId = track.getId();
//        if (mTrackId == -1 || mTrackId != newTrackId) {
//
//            final Target mArtworkTarget = new Target() {
//                @Override
//                public void onBitmapLoaded(Bitmap bitmap, Picasso.LoadedFrom from) {
//                    mNotificationView.setImageViewBitmap(R.id.simple_sound_cloud_notification_thumbnail, bitmap);
//                    mNotificationExpandedView.setImageViewBitmap(
//                            R.id.simple_sound_cloud_notification_thumbnail, bitmap);
//                    mNotificationExpandedView.setImageViewBitmap(
//                            R.id.simple_sound_cloud_notification_expanded_thumbnail, bitmap);
//                    mNotificationManager.notify(NOTIFICATION_ID, buildNotification());
//                }
//
//                @Override
//                public void onBitmapFailed(Exception e, Drawable errorDrawable) {
//
//                }
//
//                @Override
//                public void onPrepareLoad(Drawable placeHolderDrawable) {
//                }
//            };
//
//            mMainThreadHandler.post(new Runnable() {
//                @Override
//                public void run() {
////                    Picasso
////                            .get()
////                            .load(SoundCloudArtworkHelper.getArtworkUrl(track, SoundCloudArtworkHelper.XLARGE))
////                            .into(mArtworkTarget);
//                }
//            });
//
//            mTrackId = newTrackId;
//        }
//    }
//
//    /**
//     * Cancel the player notification.
//     */
//    public void cancel() {
//        mNotificationManager.cancel(NOTIFICATION_ID);
//    }
//
//    /**
//     * Initialize {@link PendingIntent} used for notification actions.
//     *
//     * @param context context used to instantiate intent.
//     */
//    private void initializePendingIntent(Context context) {
//
//        // toggle playback
//        Intent togglePlaybackIntent = new Intent(context, PlaybackService.class);
//        togglePlaybackIntent.setAction(PlaybackService.ACTION_TOGGLE_PLAYBACK);
//        mTogglePlaybackPendingIntent = PendingIntent.getService(context, REQUEST_CODE_PLAYBACK,
//                togglePlaybackIntent, PendingIntent.FLAG_UPDATE_CURRENT);
//
//        // next track
//        Intent nextPrendingIntent = new Intent(context, PlaybackService.class);
//        nextPrendingIntent.setAction(PlaybackService.ACTION_NEXT_TRACK);
//        mNextPendingIntent = PendingIntent.getService(context, REQUEST_CODE_NEXT,
//                nextPrendingIntent, PendingIntent.FLAG_UPDATE_CURRENT);
//
//        // previous track
//        Intent previousPendingIntent = new Intent(context, PlaybackService.class);
//        previousPendingIntent.setAction(PlaybackService.ACTION_PREVIOUS_TRACK);
//        mPreviousPendingIntent = PendingIntent.getService(context, REQUEST_CODE_PREVIOUS,
//                previousPendingIntent, PendingIntent.FLAG_UPDATE_CURRENT);
//
//        // clear notification
//        Intent clearPendingIntent = new Intent(context, PlaybackService.class);
//        clearPendingIntent.setAction(PlaybackService.ACTION_CLEAR_NOTIFICATION);
//        mClearPendingIntent = PendingIntent.getService(context, REQUEST_CODE_CLEAR,
//                clearPendingIntent, PendingIntent.FLAG_UPDATE_CURRENT);
//    }
//
//    /**
//     * Init all static components of the notification.
//     *
//     * @param context context used to instantiate the builder.
//     */
//    private void initNotificationBuilder(Context context) {
//
//        // inti builder.
//        mNotificationBuilder = new NotificationCompat.Builder(context, MediaNotificationManager.NOTIFICATION_CHANNEL_ID);
//        mNotificationView = new RemoteViews(context.getPackageName(),
//                R.layout.soundcloud_notification);
//        mNotificationExpandedView = new RemoteViews(context.getPackageName(),
//                R.layout.soundcloud_notification_expanded);
//
//        // add right icon on Lollipop.
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
//            addSmallIcon(mNotificationView);
//            addSmallIcon(mNotificationExpandedView);
//        }
//
//        // set pending intents
//        mNotificationView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_previous, mPreviousPendingIntent);
//        mNotificationExpandedView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_previous, mPreviousPendingIntent);
//        mNotificationView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_next, mNextPendingIntent);
//        mNotificationExpandedView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_next, mNextPendingIntent);
//        mNotificationView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_play, mTogglePlaybackPendingIntent);
//        mNotificationExpandedView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_play, mTogglePlaybackPendingIntent);
//        mNotificationView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_clear, mClearPendingIntent);
//        mNotificationExpandedView.setOnClickPendingIntent(
//                R.id.simple_sound_cloud_notification_clear, mClearPendingIntent);
//
//        // add icon for action bar.
//        mNotificationBuilder.setSmallIcon(mNotificationConfig.getNotificationIcon());
//
//        // set the remote view.
//        mNotificationBuilder.setContent(mNotificationView);
//
//        // set the notification priority.
//        mNotificationBuilder.setPriority(NotificationCompat.PRIORITY_HIGH);
//
//        // set the content intent.
//        Class<?> playerActivity = mNotificationConfig.getNotificationActivity().getClass();
//        if (playerActivity != null) {
//            Intent i = new Intent(context, playerActivity);
//
//            Bundle bundle = mNotificationConfig.getNotificationBundle();
//            if (bundle != null){
//                i.putExtras(bundle);
//            }
//
//            PendingIntent contentIntent = PendingIntent.getActivity(context, REQUEST_DISPLAYING_CONTROLLER,
//                    i, PendingIntent.FLAG_UPDATE_CURRENT);
//
//            mNotificationBuilder.setContentIntent(contentIntent);
//        }
//    }
//
//    /**
//     * Build the notification with the internal {@link Notification.Builder}
//     *
//     * @return notification ready to be displayed.
//     */
//    private Notification buildNotification() {
//        Notification notification = mNotificationBuilder.build();
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
//            notification.bigContentView = mNotificationExpandedView;
//        }
//        return notification;
//    }
//
//    private void createNotificationChannel(Context context){
//        android.app.NotificationManager notificationManager =
//                (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
//        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
//            /* Create or update. */
//            NotificationChannel channel = new NotificationChannel(MediaNotificationManager.NOTIFICATION_CHANNEL_ID,
//                    context.getString(R.string.audio_notification),
//                    android.app.NotificationManager.IMPORTANCE_LOW);
//            channel.enableVibration(false);
//            notificationManager.createNotificationChannel(channel);
//        }
//    }
//
//    /**
//     * Add the small right icon for Lollipop device.
//     *
//     * @param notificationView remotesview used in the notification.
//     */
//    private void addSmallIcon(RemoteViews notificationView) {
//        notificationView.setInt(R.layout.soundcloud_notification_icon,
//                "setBackgroundResource", mNotificationConfig.getNotificationIconBackground());
//        notificationView.setImageViewResource(R.layout.soundcloud_notification_icon,
//                mNotificationConfig.getNotificationIcon());
//    }
//
//}
