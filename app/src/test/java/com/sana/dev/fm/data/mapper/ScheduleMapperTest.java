package com.sana.dev.fm.data.mapper;

import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.enums.Weekday;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.Locale;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ScheduleMapperTest {

    @Test
    public void toDomain_withNullDto_returnsEmptyScheduleTime() {
        ScheduleTime schedule = ScheduleMapper.toDomain(null);

        assertNotNull(schedule);
        assertTrue(schedule.isEmpty());
        assertEquals(0L, schedule.getDateStart());
        assertEquals(0L, schedule.getDateEnd());
        assertEquals(0L, schedule.getTimeStart());
        assertEquals(0L, schedule.getTimeEnd());
        assertTrue(schedule.getWeekdays().isEmpty());
    }

    @Test
    public void toDomain_withValidDto_mapsAllFieldsCorrectly() {
        DateTimeModel dto = new DateTimeModel(1000L, 2000L, 3000L, 4000L);
        dto.setWeekdays(Arrays.asList(Weekday.Saturday, Weekday.Monday));
        dto.setAsMainTime(true);

        ScheduleTime domain = ScheduleMapper.toDomain(dto);

        assertNotNull(domain);
        assertFalse(domain.isEmpty());
        assertEquals(1000L, domain.getDateStart());
        assertEquals(2000L, domain.getDateEnd());
        assertEquals(3000L, domain.getTimeStart());
        assertEquals(4000L, domain.getTimeEnd());
        assertEquals(2, domain.getWeekdays().size());
        assertTrue(domain.getWeekdays().contains(Weekday.Saturday));
        assertTrue(domain.isAsMainTime());
    }

    @Test
    public void toDto_withValidDomain_mapsBackToDateTimeModel() {
        ScheduleTime domain = new ScheduleTime(1000L, 2000L, 3000L, 4000L, Collections.singletonList(Weekday.Friday), true);

        DateTimeModel dto = ScheduleMapper.toDto(domain);

        assertNotNull(dto);
        assertEquals(1000L, dto.getDateStart());
        assertEquals(2000L, dto.getDateEnd());
        assertEquals(3000L, dto.getTimeStart());
        assertEquals(4000L, dto.getTimeEnd());
        assertEquals(1, dto.getWeekdays().size());
        assertEquals(Weekday.Friday, dto.getWeekdays().get(0));
        assertTrue(dto.isAsMainTime());
    }

    @Test
    public void formatTimeRange_neverProducesNullNull() {
        // Empty schedule
        String formattedEmpty = ScheduleMapper.formatTimeRange(ScheduleTime.empty(), Locale.US);
        assertEquals("", formattedEmpty);

        // Null schedule
        String formattedNull = ScheduleMapper.formatTimeRange(null, Locale.US);
        assertEquals("", formattedNull);

        // Zero timestamps
        ScheduleTime zeroTimes = new ScheduleTime(0L, 0L, 0L, 0L, Collections.emptyList(), false);
        assertEquals("", ScheduleMapper.formatTimeRange(zeroTimes, Locale.US));
    }

    @Test
    public void formatDateRange_neverProducesNullNull() {
        // Empty schedule
        String formattedEmpty = ScheduleMapper.formatDateRange(ScheduleTime.empty(), Locale.US);
        assertEquals("", formattedEmpty);

        // Null schedule
        String formattedNull = ScheduleMapper.formatDateRange(null, Locale.US);
        assertEquals("", formattedNull);
    }
}
