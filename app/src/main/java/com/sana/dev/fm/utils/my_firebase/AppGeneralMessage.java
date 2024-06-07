package com.sana.dev.fm.utils.my_firebase;

import android.content.Context;

import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.PreferencesManager;

public class AppGeneralMessage  {

    private static AppGeneralMessage sInstance;
    private static Context ctx;

    public static synchronized AppGeneralMessage getInstance() {
        if (sInstance == null) {
            throw new IllegalStateException(PreferencesManager.class.getSimpleName() +
                    " is not initialized, call initializeInstance(..) method first.");
        }
        return sInstance;
    }

    public static synchronized void initializeInstance(Context context) {
        if (sInstance == null) {
            sInstance = new AppGeneralMessage(context);
        }
    }

    private AppGeneralMessage(Context context) {
        this.ctx = context;
    }



    private static String getString(int id) {
        if (ctx != null)
        return ctx.getString(id);
        return "";
    }

    public static final String SUCCESS = getString(R.string.done_successfully);
    public static final String FAIL = getString(R.string.error_failure);
    public static final String ERROR = getString(R.string.label_error_occurred);
}