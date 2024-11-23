package com.sana.dev.fm.utils.ugc;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Handler;
import android.os.Looper;

public class NetworkErrorHandler {
    private static final int MAX_RETRIES = 3;
    private static final int RETRY_DELAY_MS = 2000;
    private final Context context;

    public NetworkErrorHandler(Context context) {
        this.context = context.getApplicationContext();
    }

    public boolean isNetworkAvailable() {
        ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
        return activeNetwork != null && activeNetwork.isConnectedOrConnecting();
    }

    public void checkNetworkAndExecute(NetworkOperation operation, NetworkCallback callback) {
        if (!isNetworkAvailable()) {
            callback.onError(new NetworkError(NetworkErrorType.NO_CONNECTIVITY));
            return;
        }

        executeWithRetry(operation, callback, 0);
    }

    private void executeWithRetry(NetworkOperation operation, NetworkCallback callback, int retryCount) {
        operation.execute(new NetworkCallback() {
            @Override
            public void onSuccess(Object result) {
                callback.onSuccess(result);
            }

            @Override
            public void onError(NetworkError error) {
                if (shouldRetry(error, retryCount)) {
                    retryOperation(operation, callback, retryCount);
                } else {
                    callback.onError(error);
                }
            }
        });
    }

    private boolean shouldRetry(NetworkError error, int retryCount) {
        return retryCount < MAX_RETRIES &&
                (error.getType() == NetworkErrorType.TIMEOUT ||
                        error.getType() == NetworkErrorType.SERVER_ERROR);
    }

    private void retryOperation(NetworkOperation operation, NetworkCallback callback, int retryCount) {
        new Handler(Looper.getMainLooper()).postDelayed(() ->
                        executeWithRetry(operation, callback, retryCount + 1),
                RETRY_DELAY_MS * (retryCount + 1)
        );
    }
}

