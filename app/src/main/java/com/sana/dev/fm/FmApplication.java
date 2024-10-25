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
//        Timber.plant(new Timber.DebugTree());
        mInstance = this;
        setLocale();

        FirebaseApp.initializeApp(/*context=*/ this);

//        FirebaseAppCheck firebaseAppCheck = FirebaseAppCheck.getInstance();
////        firebaseAppCheck.installAppCheckProviderFactory(
////                SafetyNetAppCheckProviderFactory.getInstance());
//
//        firebaseAppCheck.getToken(true)
//                .addOnCompleteListener(new OnCompleteListener<AppCheckTokenResult>() {
//                    @Override
//                    public void onComplete(@NonNull Task<AppCheckTokenResult> task) {
//                        if (task.isSuccessful()) {
//                            AppCheckTokenResult token = task.getResult();
//                            // Use the token to protect your app's resources
//                            Log.d(TAG, "App Check token: " + token.getToken());
//                        } else {
//                            // Handle error
//                            Log.w(TAG, "Failed to get App Check token", task.getException());
//                        }
//                    }
//                });


        PreferencesManager.initializeInstance(this);
        // This flag should be set to true to enable VectorDrawable support for API < 21.
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);
        FacebookSdk.sdkInitialize(getApplicationContext());
        AppEventsLogger.activateApp(this);
    }

    @Override
    protected void attachBaseContext(Context context) {
        super.attachBaseContext(context);
//        MultiDex.install(this);
    }

    public static synchronized FmApplication getInstance() {
        return mInstance;
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        Context context = MyContextWrapper.wrap(getInstance()/*in fragment use getContext() instead of this*/, PreferencesManager.getInstance().getPrefLange());
        getResources().updateConfiguration(context.getResources().getConfiguration(), context.getResources().getDisplayMetrics());
        super.onConfigurationChanged(newConfig);
    }

    private void setLocale() {
        String languageToLoad = "ar";
        Locale locale = new Locale(languageToLoad);
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
