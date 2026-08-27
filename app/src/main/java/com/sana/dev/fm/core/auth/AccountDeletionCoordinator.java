package com.sana.dev.fm.core.auth;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthRecentLoginRequiredException;
import com.google.firebase.auth.FirebaseUser;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.PreferencesManager;

/**
 * Coordinator for executing secure account deletion:
 * 1. Invokes Firebase Authentication account deletion.
 * 2. Handles re-authentication requirement gracefully.
 * 3. Clears local session preferences and credentials completely.
 */
public final class AccountDeletionCoordinator {

    public enum DeletionResult {
        SUCCESS,
        REAUTH_REQUIRED,
        NOT_SIGNED_IN,
        ERROR
    }

    public interface DeletionCallback {
        void onResult(@NonNull DeletionResult result, @Nullable String errorMessage);
    }

    private AccountDeletionCoordinator() {
        // Utility class
    }

    public static void deleteAccount(@NonNull Context context, @NonNull DeletionCallback callback) {
        FirebaseAuth auth = FirebaseAuth.getInstance();
        FirebaseUser currentUser = auth.getCurrentUser();

        if (currentUser == null) {
            PreferencesManager.getInstance().remove(AppConstant.General.USER_INFO);
            auth.signOut();
            callback.onResult(DeletionResult.NOT_SIGNED_IN, "لا يوجد حساب مسجل حالياً");
            return;
        }

        currentUser.delete().addOnCompleteListener(task -> {
            if (task.isSuccessful()) {
                PreferencesManager.getInstance().remove(AppConstant.General.USER_INFO);
                auth.signOut();
                callback.onResult(DeletionResult.SUCCESS, null);
            } else {
                Exception exception = task.getException();
                if (exception instanceof FirebaseAuthRecentLoginRequiredException) {
                    callback.onResult(DeletionResult.REAUTH_REQUIRED, "يرجى تسجيل الدخول مرة أخرى لتأكيد حذف الحساب");
                } else {
                    String message = exception != null ? exception.getMessage() : "فشل حذف الحساب";
                    callback.onResult(DeletionResult.ERROR, message);
                }
            }
        });
    }
}
