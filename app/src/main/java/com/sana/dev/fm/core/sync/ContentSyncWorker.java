package com.sana.dev.fm.core.sync;

import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.data.datasource.FirestoreStationsRemoteDataSource;
import com.sana.dev.fm.data.repository.StationsRepositoryImpl;
import com.sana.dev.fm.domain.repository.StationsRepository;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Background WorkManager Worker to synchronize stations, programs, and episodes data.
 */
public class ContentSyncWorker extends Worker {

    public static final String WORK_NAME = "ContentSyncWorker";
    private static final String TAG = "ContentSyncWorker";

    public ContentSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting background content synchronization...");

        final CountDownLatch latch = new CountDownLatch(1);
        final AtomicBoolean isSuccess = new AtomicBoolean(false);

        try {
            FirebaseFirestore firestore = FirebaseFirestore.getInstance();
            FirestoreStationsRemoteDataSource remoteDataSource = new FirestoreStationsRemoteDataSource(firestore);
            StationsRepository repository = new StationsRepositoryImpl(remoteDataSource, getApplicationContext());

            repository.getStations(true, result -> {
                if (result.isSuccess()) {
                    Log.d(TAG, "Successfully synced " + (result.getDataOrNull() != null ? result.getDataOrNull().size() : 0) + " stations in background.");
                    isSuccess.set(true);
                } else {
                    Log.w(TAG, "Background sync completed with error: " + (result.getErrorOrNull() != null ? result.getErrorOrNull().getMessage() : "Unknown"));
                    isSuccess.set(false);
                }
                latch.countDown();
            });

            boolean completed = latch.await(20, TimeUnit.SECONDS);
            if (!completed) {
                Log.w(TAG, "Background sync timed out.");
                return Result.retry();
            }

            return isSuccess.get() ? Result.success() : Result.retry();
        } catch (Exception e) {
            Log.e(TAG, "Exception during background sync", e);
            return Result.failure();
        }
    }
}
