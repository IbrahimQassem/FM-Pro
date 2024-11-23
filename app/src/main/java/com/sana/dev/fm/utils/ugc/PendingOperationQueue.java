package com.sana.dev.fm.utils.ugc;

import android.content.Context;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.internal.bind.DateTypeAdapter;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.concurrent.TimeUnit;

public class PendingOperationQueue {
    private static final String PREFS_NAME = "pending_operations";
    private static final String KEY_OPERATIONS = "operations";
    private final Context context;
    private final Gson gson;
    private final NetworkErrorHandler networkErrorHandler;

    public PendingOperationQueue(Context context, NetworkErrorHandler networkErrorHandler) {
        this.context = context.getApplicationContext();
        this.networkErrorHandler = networkErrorHandler;
        this.gson = new GsonBuilder()
                .registerTypeAdapter(Date.class, new DateTypeAdapter())
                .create();
    }

    public void addOperation(PendingOperation operation) {
        List<PendingOperation> operations = getPendingOperations();
        operations.add(operation);
        saveOperations(operations);
        scheduleSync();
    }

    private List<PendingOperation> getPendingOperations() {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_OPERATIONS, "[]");
        Type type = new TypeToken<ArrayList<PendingOperation>>(){}.getType();
        return gson.fromJson(json, type);
    }

    private void saveOperations(List<PendingOperation> operations) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = gson.toJson(operations);
        prefs.edit().putString(KEY_OPERATIONS, json).apply();
    }

    public void processQueue() {
        if (!networkErrorHandler.isNetworkAvailable()) {
            return;
        }

        List<PendingOperation> operations = getPendingOperations();
        List<PendingOperation> remainingOperations = new ArrayList<>();

        for (PendingOperation operation : operations) {
            if (operation.isExpired()) {
                continue;
            }

            if (processOperation(operation)) {
                // Operation successful, don't add to remaining operations
//                notifyOperationComplete(operation);
            } else {
                // Operation failed, keep in queue if not exceeded max retries
                if (operation.getRetryCount() < operation.getMaxRetries()) {
                    operation.incrementRetryCount();
                    remainingOperations.add(operation);
                } else {
//                    notifyOperationFailed(operation);
                }
            }
        }

        saveOperations(remainingOperations);
    }

    private boolean processOperation(PendingOperation operation) {
//        switch (operation.getType()) {
//            case BLOCK_USER:
//                return processBlockUserOperation((BlockUserOperation) operation);
//            case UNBLOCK_USER:
//                return processUnblockUserOperation((UnblockUserOperation) operation);
//            default:
                return false;
//        }
    }

    private void scheduleSync() {
        WorkManager workManager = WorkManager.getInstance(context);

        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest syncWork = new PeriodicWorkRequest.Builder(
                SyncWorker.class,
                15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL,
                        PeriodicWorkRequest.MIN_BACKOFF_MILLIS,
                        TimeUnit.MILLISECONDS)
                .build();

        workManager.enqueueUniquePeriodicWork(
                "sync_pending_operations",
                ExistingPeriodicWorkPolicy.REPLACE,
                syncWork
        );
    }

    public static class SyncWorker extends Worker {
        private PendingOperationQueue queue;

        public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
            super(context, params);
        }

        @NonNull
        @Override
        public Result doWork() {
            if (queue == null) {
                NetworkErrorHandler networkErrorHandler = new NetworkErrorHandler(getApplicationContext());
                queue = new PendingOperationQueue(getApplicationContext(), networkErrorHandler);
            }

            queue.processQueue();
            return Result.success();
        }
    }
}

