package com.sana.dev.fm.data.mapper;

import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.enums.Weekday;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Defensive mapper converting legacy/DTO DateTimeModel to canonical ScheduleTime.
 * Ensures no null pointer exceptions or corrupted time string outputs.
 */
public final class ScheduleMapper {

    private static final String DEFAULT_TIME_PATTERN = "hh:mm a";
    private static final String DEFAULT_DATE_PATTERN = "yyyy/MM/dd";

    private ScheduleMapper() {
    }

    /**
     * Maps a nullable DateTimeModel to a canonical ScheduleTime domain model.
     */
    public static ScheduleTime toDomain(DateTimeModel dto) {
        if (dto == null) {
            return ScheduleTime.empty();
        }

        List<Weekday> weekdays = dto.getWeekdays();
        if (weekdays == null) {
            weekdays = new ArrayList<>();
        }

        return new ScheduleTime(
                dto.getDateStart(),
                dto.getDateEnd(),
                dto.getTimeStart(),
                dto.getTimeEnd(),
                weekdays,
                dto.isAsMainTime()
        );
    }

    /**
     * Converts a canonical ScheduleTime back to a legacy DateTimeModel for compatibility.
     */
    public static DateTimeModel toDto(ScheduleTime domain) {
        if (domain == null || domain.isEmpty()) {
            return new DateTimeModel();
        }

        DateTimeModel model = new DateTimeModel(
                domain.getDateStart(),
                domain.getDateEnd(),
                domain.getTimeStart(),
                domain.getTimeEnd()
        );
        model.setWeekdays(new ArrayList<>(domain.getWeekdays()));
        model.setAsMainTime(domain.isAsMainTime());
        return model;
    }

    /**
     * Formats schedule time range cleanly, preventing "null - null" strings.
     */
    public static String formatTimeRange(ScheduleTime scheduleTime, Locale locale) {
        if (scheduleTime == null || scheduleTime.isEmpty()) {
            return "";
        }
        if (scheduleTime.getTimeStart() <= 0 && scheduleTime.getTimeEnd() <= 0) {
            return "";
        }

        Locale targetLocale = locale != null ? locale : Locale.getDefault();
        SimpleDateFormat sdf = new SimpleDateFormat(DEFAULT_TIME_PATTERN, targetLocale);

        if (scheduleTime.getTimeStart() > 0 && scheduleTime.getTimeEnd() > 0) {
            return sdf.format(new Date(scheduleTime.getTimeStart())) + " - " + sdf.format(new Date(scheduleTime.getTimeEnd()));
        } else if (scheduleTime.getTimeStart() > 0) {
            return sdf.format(new Date(scheduleTime.getTimeStart()));
        } else {
            return sdf.format(new Date(scheduleTime.getTimeEnd()));
        }
    }

    /**
     * Formats schedule date range cleanly, preventing "null - null" strings.
     */
    public static String formatDateRange(ScheduleTime scheduleTime, Locale locale) {
        if (scheduleTime == null || scheduleTime.isEmpty()) {
            return "";
        }
        if (scheduleTime.getDateStart() <= 0 && scheduleTime.getDateEnd() <= 0) {
            return "";
        }

        Locale targetLocale = locale != null ? locale : Locale.getDefault();
        SimpleDateFormat sdf = new SimpleDateFormat(DEFAULT_DATE_PATTERN, targetLocale);

        if (scheduleTime.getDateStart() > 0 && scheduleTime.getDateEnd() > 0) {
            return sdf.format(new Date(scheduleTime.getDateStart())) + " - " + sdf.format(new Date(scheduleTime.getDateEnd()));
        } else if (scheduleTime.getDateStart() > 0) {
            return sdf.format(new Date(scheduleTime.getDateStart()));
        } else {
            return sdf.format(new Date(scheduleTime.getDateEnd()));
        }
    }
}
