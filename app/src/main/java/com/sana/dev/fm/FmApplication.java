package com.sana.dev.fm;

import android.app.Application;
import android.content.Context;

import androidx.appcompat.app.AppCompatDelegate;
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

        // This flag should be set to true to enable VectorDrawable support for API < 21.
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true);
        // We recommend to start AppSpector from Application#onCreate method

//        // You can start all monitors
//        AppSpector
//                .build(this)
//                .withDefaultMonitors()
//                .run("android_MzVmNTkzYmItMmYxMy00ZGYyLWJjYTItNGNkZjEzMjkyMWNl");
//
//        // Or you can select monitors that you want to use
//        AppSpector
//                .build(this)
//                .addPerformanceMonitor()
//                .addHttpMonitor()
//                // If specific monitor is not added then this kind of data won't be tracked and available on the web
//                .addLogMonitor()
//                .addScreenshotMonitor()
//                .addSQLMonitor()
//                .run("android_MzVmNTkzYmItMmYxMy00ZGYyLWJjYTItNGNkZjEzMjkyMWNl");
    }

    @Override
    protected void attachBaseContext(Context context) {
        super.attachBaseContext(context);
//        MultiDex.install(this);
    }


    // Volley Singlton
    public static synchronized FmApplication getInstance() {
        return mInstance;
    }


    // For Check Internet
//    public static void registerForNetworkChangeEvents(final Context context) {
//        NetworkStateChangeReceiver networkStateChangeReceiver = new NetworkStateChangeReceiver();
//        context.registerReceiver(networkStateChangeReceiver, new IntentFilter(CONNECTIVITY_ACTION));
//        context.registerReceiver(networkStateChangeReceiver, new IntentFilter(WIFI_STATE_CHANGE_ACTION));
//    }



}
