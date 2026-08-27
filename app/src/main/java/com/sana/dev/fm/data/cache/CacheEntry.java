package com.sana.dev.fm.data.cache;

import java.io.Serializable;
import java.util.Objects;

/**
 * Generic immutable wrapper for cached items with timestamp and time-to-live (TTL).
 *
 * @param <T> Payload data type
 */
public final class CacheEntry<T> implements Serializable {

    private final T data;
    private final long createdAtMillis;
    private final long ttlMillis;

    public CacheEntry(T data, long createdAtMillis, long ttlMillis) {
        this.data = data;
        this.createdAtMillis = createdAtMillis;
        this.ttlMillis = Math.max(0, ttlMillis);
    }

    public T getData() {
        return data;
    }

    public long getCreatedAtMillis() {
        return createdAtMillis;
    }

    public long getTtlMillis() {
        return ttlMillis;
    }

    public boolean isExpired(long currentTimeMillis) {
        if (ttlMillis == 0) {
            return false; // 0 means indefinitely valid until invalidated
        }
        return currentTimeMillis > (createdAtMillis + ttlMillis);
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CacheEntry<?> that = (CacheEntry<?>) o;
        return createdAtMillis == that.createdAtMillis &&
                ttlMillis == that.ttlMillis &&
                Objects.equals(data, that.data);
    }

    @Override
    public int hashCode() {
        return Objects.hash(data, createdAtMillis, ttlMillis);
    }

    @Override
    public String toString() {
        return "CacheEntry{" +
                "createdAtMillis=" + createdAtMillis +
                ", ttlMillis=" + ttlMillis +
                '}';
    }
}
