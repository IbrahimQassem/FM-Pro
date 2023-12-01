package com.sana.dev.fm;

import android.app.Application;
import android.content.Context;
import android.content.res.Configuration;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatDelegate;

import com.facebook.FacebookSdk;
import com.facebook.appevents.AppEventsLogger;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.AppCheckTokenResult;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;


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

}
