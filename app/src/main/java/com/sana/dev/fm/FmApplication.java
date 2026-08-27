package com.sana.dev.fm;

import android.app.Application;
import android.content.Context;
import android.content.res.Configuration;
import android.os.Build;

import androidx.appcompat.app.AppCompatDelegate;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.google.firebase.FirebaseApp;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;

import java.util.Locale;


/*
 * Created by Ibrahim Qassem on 05.11.2021.
 */
public class FmApplication extends Application {
    public static final String TAG = FmApplication.class.getSimpleName();
    private static FmApplication mInstance;

    @Override
    public void onCreate() {
        super.onCreate();
        mInstance = this;
        PreferencesManager.initializeInstance(this);

        applyNightMode();
        setLocale();

        FirebaseApp.initializeApp(/*context=*/ this);

        // This flag should be set to true to enable VectorDrawable support for API < 21.
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);
        FacebookSdk.sdkInitialize(getApplicationContext());
        AppEventsLogger.activateApp(this);
    }

    private void applyNightMode() {
        int nightMode = PreferencesManager.getInstance().getNightMode();
        AppCompatDelegate.setDefaultNightMode(nightMode);
    }

    @Override
    protected void attachBaseContext(Context context) {
        super.attachBaseContext(context);
    }

    public static synchronized FmApplication getInstance() {
        return mInstance;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        Context context = MyContextWrapper.wrap(getInstance(), PreferencesManager.getInstance().getPrefLanguage());
        getResources().updateConfiguration(context.getResources().getConfiguration(), context.getResources().getDisplayMetrics());
        super.onConfigurationChanged(newConfig);
    }

    private void setLocale() {
        String languageToLoad = PreferencesManager.getInstance().getPrefLanguage();
        Locale locale = new Locale(languageToLoad != null ? languageToLoad : "ar");
        Locale.setDefault(locale);

        Configuration config = getBaseContext().getResources().getConfiguration();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN_MR1) {
            config.setLayoutDirection(locale);
        }
        config.locale = locale;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            getApplicationContext().createConfigurationContext(config);
        }
        getBaseContext().getResources().updateConfiguration(config,
                getBaseContext().getResources().getDisplayMetrics());
    }

}
