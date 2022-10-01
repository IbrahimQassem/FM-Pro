package com.sana.dev.fm.utils.radio_player;

import android.app.Activity;
import android.os.Bundle;

import androidx.annotation.DrawableRes;

/**
 * Encapsulate notification config.
 */
public final class NotificationConfig {

    /**
     * Icon used in the status bar as well as small right icon on Lollipop.
     */
    private int mNotificationIcon;

    /**
     * Background for the small right icon on Lollipop.
     */
    private int mNotificationIconBackground;

    /**
     * Activity which should be launched when user touch the notification.
     */
    private Activity mNotificationActivity;

    /**
     * A bundle to open the fragment within the activity with the correct  data.
     */
    private Bundle mNotificationBundle;

    /**
     * Default constructor.
     */
    public NotificationConfig() {
    }

    /**
     * Icon used in the status bar as well as small right icon on Lollipop.
     *
     * @return icon res id.
     */
    public int getNotificationIcon() {
        return mNotificationIcon;
    }

    /**
     * Icon used in the status bar as well as small right icon on Lollipop.
     *
     * @param notificationIcon icon res id.
     */
    public void setNotificationIcon(@DrawableRes int notificationIcon) {
        mNotificationIcon = notificationIcon;
    }

    /**
     * Background for the small right icon on Lollipop.
     *
     * @return icon background res id.
     */
    public int getNotificationIconBackground() {
        return mNotificationIconBackground;
    }

    /**
     * Background for the small right icon on Lollipop.
     *
     * @param notificationIconBackground icon background res id.
     */
    public void setNotificationIconBackground(@DrawableRes int notificationIconBackground) {
        mNotificationIconBackground = notificationIconBackground;
    }

    /**
     * Activity which should be launched when user touch the notification.
     *
     * @return activity which should be started when user touch the notification.
     */
    public Activity getNotificationActivity() {
        return mNotificationActivity;
    }

    /**
     * Activity which should be launched when user touch the notification.
     *
     * @param notificationActivity activity which should be started when user touch the notification.
     */
    public void setNotificationActivity(Activity notificationActivity) {
        mNotificationActivity = notificationActivity;
    }

    public void setNotificationBundle(Bundle bundle){
        this.mNotificationBundle = bundle;
    }

    public Bundle getNotificationBundle(){
        return mNotificationBundle;
    }
}
