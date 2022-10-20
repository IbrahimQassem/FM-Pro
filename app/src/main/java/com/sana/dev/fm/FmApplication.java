package com.sana.dev.fm;

import android.app.Activity;
import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.preference.PreferenceManager;
import android.util.Log;

import androidx.appcompat.app.AppCompatDelegate;

import com.sana.dev.fm.utils.MyContextWrapper;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;

import org.checkerframework.checker.units.qual.A;

import java.util.Locale;
//import androidx.multidex.MultiDex;


/*
 * Created by  on 05.11.2021.
 */
public class FmApplication extends Application {

    public static final String TAG = FmApplication.class.getSimpleName();


    private static FmApplication mInstance;

//    private String radioName;
//    public String getRadioName() {return radioName;}
//    public void setRadioName(String radioName) {this.radioName = radioName;}

    @Override
    public void onCreate() {
        super.onCreate();
//        Timber.plant(new Timber.DebugTree());
        mInstance = this;
        PreferencesManager.initializeInstance(this);

        // This flag should be set to true to enable VectorDrawable support for API < 21.
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);
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
