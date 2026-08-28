package com.sana.dev.fm.core.sync;

import android.content.Context;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.util.concurrent.TimeUnit;

/**
 * Manages periodic and on-demand synchronization scheduling.
 */
public final class SyncManager {

    private static final String PERIODIC_SYNC_TAG = "FM_PERIODIC_CONTENT_SYNC";
    private static final String ONETIME_SYNC_TAG = "FM_ONETIME_CONTENT_SYNC";

    private SyncManager() {
    }

    public static void schedulePeriodicSync(Context context) {
        if (context == null) return;

        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        PeriodicWorkRequest syncRequest = new PeriodicWorkRequest.Builder(
                ContentSyncWorker.class,
                6, TimeUnit.HOURS,
                15, TimeUnit.MINUTES
        )
                .setConstraints(constraints)
                .addTag(PERIODIC_SYNC_TAG)
                .build();

        WorkManager.getInstance(context.getApplicationContext())
                .enqueueUniquePeriodicWork(
                        ContentSyncWorker.WORK_NAME,
                        ExistingPeriodicWorkPolicy.KEEP,
                        syncRequest
                );
    }

    public static void syncNow(Context context) {
        if (context == null) return;

        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();

        OneTimeWorkRequest oneTimeRequest = new OneTimeWorkRequest.Builder(ContentSyncWorker.class)
                .setConstraints(constraints)
                .addTag(ONETIME_SYNC_TAG)
                .build();

        WorkManager.getInstance(context.getApplicationContext())
                .enqueueUniqueWork(
                        "OneTimeContentSync",
                        ExistingWorkPolicy.REPLACE,
                        oneTimeRequest
                );
    }
}
