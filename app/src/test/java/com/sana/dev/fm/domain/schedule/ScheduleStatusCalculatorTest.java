package com.sana.dev.fm.domain.schedule;

import org.junit.Test;

import java.io.File;
import java.nio.file.Files;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ScheduleStatusCalculatorTest {

    @Test
    public void calculateStatus_returnsNow_whenCurrentTimeWithinWindow() {
        long start = 10000L;
        long end = 20000L;
        long current = 15000L;

        ScheduleStatusCalculator.Status status = ScheduleStatusCalculator.calculateStatus(current, start, end);
        assertEquals(ScheduleStatusCalculator.Status.NOW, status);
    }

    @Test
    public void calculateStatus_returnsNext_whenCurrentTimeWithinNext3Hours() {
        long current = 1000000L;
        long start = current + (2 * 60 * 60 * 1000L); // 2 hours in future
        long end = start + 3600000L;

        ScheduleStatusCalculator.Status status = ScheduleStatusCalculator.calculateStatus(current, start, end);
        assertEquals(ScheduleStatusCalculator.Status.NEXT, status);
    }

    @Test
    public void calculateStatus_returnsUpcoming_whenCurrentTimeMoreThan3HoursBefore() {
        long current = 1000000L;
        long start = current + (5 * 60 * 60 * 1000L); // 5 hours in future
        long end = start + 3600000L;

        ScheduleStatusCalculator.Status status = ScheduleStatusCalculator.calculateStatus(current, start, end);
        assertEquals(ScheduleStatusCalculator.Status.UPCOMING, status);
    }

    @Test
    public void calculateStatus_returnsEnded_whenCurrentTimeAfterEnd() {
        long start = 10000L;
        long end = 20000L;
        long current = 25000L;

        ScheduleStatusCalculator.Status status = ScheduleStatusCalculator.calculateStatus(current, start, end);
        assertEquals(ScheduleStatusCalculator.Status.ENDED, status);
    }

    @Test
    public void strings_containScheduleStatusTranslations() throws Exception {
        File file = new File("src/main/res/values/strings.xml");
        assertTrue("strings.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Must contain status_now", content.contains("name=\"status_now\""));
        assertTrue("Must contain status_next", content.contains("name=\"status_next\""));
        assertTrue("Must contain status_ended", content.contains("name=\"status_ended\""));
        assertTrue("Must contain status_upcoming", content.contains("name=\"status_upcoming\""));
    }

    @Test
    public void scheduleLayout_containsStateLayout() throws Exception {
        File file = new File("src/main/res/layout/fragment_radio_map.xml");
        assertTrue("fragment_radio_map.xml must exist", file.exists());

        String content = new String(Files.readAllBytes(file.toPath()));
        assertTrue("Schedule layout must embed StateLayout",
                content.contains("<com.sana.dev.fm.ui.widget.StateLayout"));
    }
}
