package com.sana.dev.fm.utils;

import android.content.Context;
import android.content.Intent;

import com.sana.dev.fm.ui.activity.AppIntroLight;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.ui.activity.NoInternetActivity;
import com.sana.dev.fm.ui.activity.SplashActivity;
import com.sana.dev.fm.ui.activity.appuser.PhoneLoginActivity;
import com.sana.dev.fm.ui.activity.appuser.UserProfileActivity;

public class IntentHelper {

    public static Intent splashActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, SplashActivity.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent introActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, AppIntroLight.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent mainActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, MainActivity.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent noInternetActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, NoInternetActivity.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent phoneLoginActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, PhoneLoginActivity.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }

    public static Intent userProfileActivity(Context context, boolean clearStack) {
        Intent intent = new Intent(context, UserProfileActivity.class);
        if (clearStack) {
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TASK | Intent.FLAG_ACTIVITY_NEW_TASK);
        }
        return intent;
    }
}
