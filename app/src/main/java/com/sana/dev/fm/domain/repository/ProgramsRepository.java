package com.sana.dev.fm.domain.repository;

import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.domain.model.Program;

import java.util.List;

/**
 * Pure domain repository interface for fetching and querying Radio Programs.
 * Contains no dependencies on Firebase SDK or Android framework UI classes.
 */
public interface ProgramsRepository {

    interface Callback<T> {
        void onResult(T result);
    }

    /**
     * Fetches all active programs for a specific station/radio.
     *
     * @param radioId  The unique station identifier.
     * @param callback Callback delivering Result with list of canonical Program entities.
     */
    void getProgramsByRadio(String radioId, Callback<Result<List<Program>>> callback);

    /**
     * Fetches a single program by its ID.
     *
     * @param radioId   The unique station identifier.
     * @param programId The unique program identifier.
     * @param callback  Callback delivering Result with the canonical Program entity.
     */
    void getProgramById(String radioId, String programId, Callback<Result<Program>> callback);
}
