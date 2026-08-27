package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.core.time.Clock;
import com.sana.dev.fm.data.cache.CacheEntry;
import com.sana.dev.fm.domain.model.Program;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe in-memory cache implementation of ProgramsLocalDataSource.
 * Honors TTL and allows controlled time-based expiration via Clock.
 */
public class InMemoryProgramsLocalDataSource implements ProgramsLocalDataSource {

    private final ConcurrentHashMap<String, CacheEntry<List<Program>>> cache = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryProgramsLocalDataSource() {
        this(Clock.SYSTEM);
    }

    public InMemoryProgramsLocalDataSource(Clock clock) {
        this.clock = clock != null ? clock : Clock.SYSTEM;
    }

    @Override
    public List<Program> getCachedPrograms(String radioId) {
        if (radioId == null || radioId.trim().isEmpty()) {
            return null;
        }
        CacheEntry<List<Program>> entry = cache.get(radioId.trim());
        if (entry == null) {
            return null;
        }
        if (entry.isExpired(clock.currentTimeMillis())) {
            return null;
        }
        return entry.getData();
    }

    @Override
    public CacheEntry<List<Program>> getCacheEntry(String radioId) {
        if (radioId == null || radioId.trim().isEmpty()) {
            return null;
        }
        return cache.get(radioId.trim());
    }

    @Override
    public void savePrograms(String radioId, List<Program> programs, long ttlMillis) {
        if (radioId == null || radioId.trim().isEmpty()) {
            return;
        }
        List<Program> defensiveCopy = programs != null ? Collections.unmodifiableList(new ArrayList<>(programs)) : Collections.emptyList();
        CacheEntry<List<Program>> entry = new CacheEntry<>(defensiveCopy, clock.currentTimeMillis(), ttlMillis);
        cache.put(radioId.trim(), entry);
    }

    @Override
    public void savePrograms(String radioId, List<Program> programs) {
        savePrograms(radioId, programs, DEFAULT_TTL_MILLIS);
    }

    @Override
    public void clearCache(String radioId) {
        if (radioId != null) {
            cache.remove(radioId.trim());
        }
    }

    @Override
    public void clearAll() {
        cache.clear();
    }
}
