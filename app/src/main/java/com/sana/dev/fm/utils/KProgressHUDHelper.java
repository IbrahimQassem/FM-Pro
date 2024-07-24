package com.sana.dev.fm.utils;

import android.app.Activity;
import android.util.Log;

import com.kaopiz.kprogresshud.KProgressHUD;
import com.sana.dev.fm.R;

public class KProgressHUDHelper {
    private Activity activity;
    private static volatile KProgressHUDHelper instance;
    private KProgressHUD hud;

    public KProgressHUDHelper(Activity activity) {
        hud = KProgressHUD.create(activity);
    }

//    public static KProgressHUDHelper getInstance(Activity activity) {
//        this.activity = activity;
//        if (instance == null) {
//            synchronized (KProgressHUDHelper.class) {
//                if (instance == null) {
//                    instance = new KProgressHUDHelper(activity);
//                }
//            }
//        }
//        return instance;
//    }

    public void showLoading(String message,boolean isCancellable) {
        hud.setStyle(KProgressHUD.Style.SPIN_INDETERMINATE)
                .setLabel(message)
//                .setDetailsLabel(message)
                .setCancellable(isCancellable)
                .setAnimationSpeed(2)
                .setDimAmount(0.5f)
                .show();

//        if(!((Activity) instance).isFinishing())
//        {
//            //show dialog
//        }
    }

    public void showSuccess(String message) {
        hud.setStyle(KProgressHUD.Style.PIE_DETERMINATE)
                .setCancellable(true)
                .setAnimationSpeed(2)
                .setLabel(message)
                .show();
    }

    public void showError(String message) {
        hud.setStyle(KProgressHUD.Style.BAR_DETERMINATE)
                .setCancellable(true)
                .setAnimationSpeed(2)
                .setLabel(message)
                .show();
    }

    public void dismiss() {
        if (hud.isShowing()) {
            hud.dismiss();
        }
    }


    public void setProgress(float progress) {
        if (hud.isShowing() /*&& hud.hasIndeterminate()*/) {
            // Check if HUD is showing and has indeterminate style (e.g., SPIN_INDETERMINATE)
            hud.setProgress((int) progress);
        } else {
            // Consider throwing an exception or logging a warning if progress
            // is set on an incompatible HUD style
            Log.w("KProgressHUDHelper", "Cannot set progress on non-indeterminate HUD");
        }
    }
}
