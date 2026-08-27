package com.sana.dev.fm.domain.model;

import com.sana.dev.fm.model.enums.Weekday;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Pure domain model representing program schedule time slots.
 * Free of UI dependencies and resilient against null values.
 */
public final class ScheduleTime implements Serializable {
    private final long dateStart;
    private final long dateEnd;
    private final long timeStart;
    private final long timeEnd;
    private final List<Weekday> weekdays;
    private final boolean asMainTime;

    public ScheduleTime(long dateStart, long dateEnd, long timeStart, long timeEnd, List<Weekday> weekdays, boolean asMainTime) {
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.timeStart = timeStart;
        this.timeEnd = timeEnd;
        this.weekdays = weekdays != null ? Collections.unmodifiableList(new ArrayList<>(weekdays)) : Collections.emptyList();
        this.asMainTime = asMainTime;
    }

    public static ScheduleTime empty() {
        return new ScheduleTime(0L, 0L, 0L, 0L, Collections.emptyList(), false);
    }

    public boolean isEmpty() {
        return dateStart == 0L && dateEnd == 0L && timeStart == 0L && timeEnd == 0L && weekdays.isEmpty();
    }

    public long getDateStart() {
        return dateStart;
    }

    public long getDateEnd() {
        return dateEnd;
    }

    public long getTimeStart() {
        return timeStart;
    }

    public long getTimeEnd() {
        return timeEnd;
    }

    public List<Weekday> getWeekdays() {
        return weekdays;
    }

    public boolean isAsMainTime() {
        return asMainTime;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ScheduleTime that = (ScheduleTime) o;
        return dateStart == that.dateStart &&
                dateEnd == that.dateEnd &&
                timeStart == that.timeStart &&
                timeEnd == that.timeEnd &&
                asMainTime == that.asMainTime &&
                Objects.equals(weekdays, that.weekdays);
    }

    @Override
    public int hashCode() {
        return Objects.hash(dateStart, dateEnd, timeStart, timeEnd, weekdays, asMainTime);
    }

    @Override
    public String toString() {
        return "ScheduleTime{" +
                "dateStart=" + dateStart +
                ", dateEnd=" + dateEnd +
                ", timeStart=" + timeStart +
                ", timeEnd=" + timeEnd +
                ", weekdays=" + weekdays +
                ", asMainTime=" + asMainTime +
                '}';
    }
}
