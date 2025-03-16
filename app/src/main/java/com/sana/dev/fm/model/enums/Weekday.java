package com.sana.dev.fm.model.enums;

import android.content.Context;
import android.util.Log;

import com.sana.dev.fm.R;

import java.util.ArrayList;
import java.util.List;

//public enum Weekday {
//    Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday, Friday
//}




// Weekday Status Enum
public enum Weekday {
    Saturday(R.string.saturday, 0),
    Sunday(R.string.sunday, 1),
    Monday(R.string.monday,2),
    Tuesday(R.string.tuesday,  3),
    Wednesday(R.string.wednesday,   4),
    Thursday(R.string.thursday,   5),
    Friday(R.string.friday,  6);

    private final int stringResId;
    private final int order;

    Weekday(int stringResId, int order) {
        this.stringResId = stringResId;
        this.order = order;
    }

    /**
     * Convert string to Weekday safely
     */
    public static Weekday fromString(String status) {
        try {
            return status != null ? valueOf(status.toUpperCase()) : Saturday;
        } catch (IllegalArgumentException e) {
            Log.e("Weekday", "Invalid status: " + status);
            return Saturday;
        }
    }

    /**
     * Get translated name of the status
     */
    public String getTranslatedName(Context context) {
        return context.getString(stringResId);
    }

    /**
     * Check if status can be updated to new status
     */
    public boolean canTransitionTo(Weekday newStatus) {
        return newStatus.order > this.order && newStatus != Friday;
    }

    /**
     * Check if this is a final status
     */
    public boolean isFinalStatus() {
        return this == Wednesday || this == Friday;
    }

    /**
     * Check if order is active
     */
    public boolean isActive() {
        return this != Wednesday && this != Friday;
    }

    /**
     * Get next possible statuses
     */
    public List<Weekday> getNextPossibleStatuses() {
        List<Weekday> possibleStatuses = new ArrayList<>();
        for (Weekday status : Weekday.values()) {
            if (this.canTransitionTo(status)) {
                possibleStatuses.add(status);
            }
        }
        return possibleStatuses;
    }

    /**
     * Get status progress (0-100)
     */
    public int getProgress() {
        return (order * 100) / (Weekday.values().length - 1);
    }
}