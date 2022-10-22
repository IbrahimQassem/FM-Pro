package com.sana.dev.fm.utils;


import static com.sana.dev.fm.FmApplication.TAG;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.auth.AuthResult;

/**
 * Notifies the user of sign in successes or failures beyond the lifecycle of an activity.
 */
public class SignInResultNotifier implements OnCompleteListener<AuthResult> {
    private Context mContext;

    public SignInResultNotifier(@NonNull Context context) {
        mContext = context.getApplicationContext();
    }

    @Override
    public void onComplete(@NonNull Task<AuthResult> task) {
        if (task.isSuccessful()) {
            // Sign in success, update UI with the signed-in user's information
            LogUtility.d(LogUtility.TAG, "signInAnonymously:success");
         } else {
            // If sign in fails, display a message to the user.
            LogUtility.e(LogUtility.TAG, "signInAnonymously:failure", task.getException());
         }
    }


}