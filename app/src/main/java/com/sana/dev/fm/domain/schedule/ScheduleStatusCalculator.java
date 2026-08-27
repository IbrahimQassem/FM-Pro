package com.sana.dev.fm.domain.schedule;

import androidx.annotation.NonNull;

/**
 * Pure domain calculator for determining schedule item status (NOW, NEXT, ENDED, UPCOMING).
 * Independent of Android UI and timezone-resilient.
 */
public final class ScheduleStatusCalculator {

    public enum Status {
        NOW,
        NEXT,
        ENDED,
        UPCOMING
    }

    private static final long NEXT_WINDOW_THRESHOLD_MILLIS = 3 * 60 * 60 * 1000L; // 3 hours

    private ScheduleStatusCalculator() {
        // Utility class
    }

    @NonNull
    public static Status calculateStatus(long currentTimeMillis, long startMillis, long endMillis) {
        if (currentTimeMillis >= startMillis && currentTimeMillis <= endMillis) {
            return Status.NOW;
        } else if (currentTimeMillis < startMillis) {
            long timeUntilStart = startMillis - currentTimeMillis;
            if (timeUntilStart <= NEXT_WINDOW_THRESHOLD_MILLIS) {
                return Status.NEXT;
            }
            return Status.UPCOMING;
        } else {
            return Status.ENDED;
        }
    }
}
