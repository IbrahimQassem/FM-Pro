package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.data.cache.CacheEntry;
import com.sana.dev.fm.domain.model.Program;

import java.util.List;

/**
 * Local data source interface for caching radio programs.
 */
public interface ProgramsLocalDataSource {

    /**
     * Default TTL: 1 hour in milliseconds.
     */
    long DEFAULT_TTL_MILLIS = 60 * 60 * 1000L;

    /**
     * Returns cached programs for a station, or null if no cache exists or if expired.
     */
    List<Program> getCachedPrograms(String radioId);

    /**
     * Returns the raw CacheEntry for a station, regardless of expiration state.
     */
    CacheEntry<List<Program>> getCacheEntry(String radioId);

    /**
     * Saves programs to local cache with a specific TTL in milliseconds.
     */
    void savePrograms(String radioId, List<Program> programs, long ttlMillis);

    /**
     * Saves programs to local cache with the default TTL (1 hour).
     */
    void savePrograms(String radioId, List<Program> programs);

    /**
     * Clears cached programs for a specific station.
     */
    void clearCache(String radioId);

    /**
     * Clears all cached programs across all stations.
     */
    void clearAll();
}
