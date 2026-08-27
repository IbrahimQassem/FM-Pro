package com.sana.dev.fm.data.mapper;

import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.enums.Weekday;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class ProgramMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyProgram() {
        Program program = ProgramMapper.toDomain(null);

        assertNotNull(program);
        assertEquals("", program.getId());
        assertEquals("", program.getRadioId());
        assertEquals("", program.getName());
        assertEquals("", program.getDescription());
        assertTrue(program.getCategories().isEmpty());
        assertEquals("", program.getTag());
        assertEquals("", program.getProfileImageUrl());
        assertEquals(0, program.getLikesCount());
        assertEquals(0, program.getSubscribeCount());
        assertEquals(0, program.getRateCount());
        assertEquals(0, program.getEpisodeCount());
        assertFalse(program.isDisabled());
        assertNotNull(program.getScheduleTime());
        assertTrue(program.getScheduleTime().isEmpty());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        DateTimeModel schedule = new DateTimeModel(100L, 200L, 300L, 400L);
        schedule.setWeekdays(Collections.singletonList(Weekday.Saturday));

        RadioProgram dto = new RadioProgram(
                "prog_1",
                "radio_1",
                "Morning Show",
                "A lively morning show",
                Arrays.asList("News", "Morning"),
                "#morning",
                "https://example.com/pic.jpg",
                15,
                25,
                5,
                "1670000000",
                "admin_user",
                false,
                "",
                schedule
        );
        dto.setEpisodeCount(10);

        Program domain = ProgramMapper.toDomain(dto);

        assertNotNull(domain);
        assertEquals("prog_1", domain.getId());
        assertEquals("radio_1", domain.getRadioId());
        assertEquals("Morning Show", domain.getName());
        assertEquals("A lively morning show", domain.getDescription());
        assertEquals(2, domain.getCategories().size());
        assertEquals("News", domain.getCategories().get(0));
        assertEquals("#morning", domain.getTag());
        assertEquals("https://example.com/pic.jpg", domain.getProfileImageUrl());
        assertEquals(15, domain.getLikesCount());
        assertEquals(25, domain.getSubscribeCount());
        assertEquals(5, domain.getRateCount());
        assertEquals(10, domain.getEpisodeCount());
        assertEquals("1670000000", domain.getTimestamp());
        assertEquals("admin_user", domain.getCreatedBy());
        assertFalse(domain.isDisabled());
        assertEquals("", domain.getStopNote());
        assertEquals(100L, domain.getScheduleTime().getDateStart());
        assertEquals(200L, domain.getScheduleTime().getDateEnd());
    }

    @Test
    public void toDomain_withMissingAndNullFields_sanitizesValuesGracefully() {
        RadioProgram dto = new RadioProgram();
        dto.setProgramId("prog_partial");
        dto.setPrName(null);
        dto.setPrDesc(null);
        dto.setPrCategoryList(null);
        dto.setPrTag(null);
        dto.setPrProfile(null);
        dto.setLikesCount(-5);
        dto.setSubscribeCount(-10);
        dto.setDisabled(true);
        dto.setStopNote(null);
        dto.setProgramScheduleTime(null);

        Program domain = ProgramMapper.toDomain(dto);

        assertNotNull(domain);
        assertEquals("prog_partial", domain.getId());
        assertEquals("", domain.getName());
        assertEquals("", domain.getDescription());
        assertTrue(domain.getCategories().isEmpty());
        assertEquals("", domain.getTag());
        assertEquals("", domain.getProfileImageUrl());
        assertEquals(0, domain.getLikesCount());
        assertEquals(0, domain.getSubscribeCount());
        assertTrue(domain.isDisabled());
        assertEquals("", domain.getStopNote());
        assertNotNull(domain.getScheduleTime());
        assertTrue(domain.getScheduleTime().isEmpty());
    }

    @Test
    public void toDto_roundTrip_preservesIntegrity() {
        ScheduleTime schedule = new ScheduleTime(1000L, 2000L, 3000L, 4000L, Collections.singletonList(Weekday.Tuesday), false);
        Program domain = new Program(
                "p100",
                "r200",
                "Evening Podcast",
                "Podcast description",
                Collections.singletonList("Culture"),
                "#culture",
                "http://img.jpg",
                50,
                100,
                4,
                8,
                "12345678",
                "editor_1",
                false,
                "",
                schedule
        );

        RadioProgram dto = ProgramMapper.toDto(domain);

        assertNotNull(dto);
        assertEquals("p100", dto.getProgramId());
        assertEquals("r200", dto.getRadioId());
        assertEquals("Evening Podcast", dto.getPrName());
        assertEquals("Podcast description", dto.getPrDesc());
        assertEquals(1, dto.getPrCategoryList().size());
        assertEquals("Culture", dto.getPrCategoryList().get(0));
        assertEquals("#culture", dto.getPrTag());
        assertEquals(8, dto.getEpisodeCount());
        assertNotNull(dto.getProgramScheduleTime());
        assertEquals(1000L, dto.getProgramScheduleTime().getDateStart());
    }

    @Test
    public void fromMap_parsesRawFirestoreDataSafely() {
        Map<String, Object> data = new HashMap<>();
        data.put("programId", "doc_999");
        data.put("radioId", "radio_888");
        data.put("prName", "Night Waves");
        data.put("prDesc", "Late night show");
        data.put("likesCount", 120);
        data.put("disabled", false);

        Program program = ProgramMapper.fromMap("doc_999", data);

        assertNotNull(program);
        assertEquals("doc_999", program.getId());
        assertEquals("radio_888", program.getRadioId());
        assertEquals("Night Waves", program.getName());
        assertEquals("Late night show", program.getDescription());
        assertEquals(120, program.getLikesCount());
        assertFalse(program.isDisabled());
    }
}
