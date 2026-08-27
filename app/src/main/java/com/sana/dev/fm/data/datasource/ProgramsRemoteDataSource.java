package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.model.RadioProgram;

import java.util.List;

/**
 * Remote data source abstraction for fetching radio programs from backend / Firestore.
 */
public interface ProgramsRemoteDataSource {

    interface DataSourceCallback<T> {
        void onSuccess(T data);

        void onError(Exception exception);
    }

    /**
     * Fetches raw RadioProgram DTOs for a given station from Firestore under baseDb root.
     */
    void fetchPrograms(String baseDb, String radioId, DataSourceCallback<List<RadioProgram>> callback);

    /**
     * Fetches a specific RadioProgram DTO from Firestore under baseDb root.
     */
    void fetchProgram(String baseDb, String radioId, String programId, DataSourceCallback<RadioProgram> callback);
}
