package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.domain.model.Station;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class StationMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyStation() {
        Station station = StationMapper.toDomain(null, "fallback_id");

        assertNotNull(station);
        assertEquals("fallback_id", station.getId());
        assertEquals("", station.getName());
        assertEquals("", station.getStreamUrl());
        assertEquals("", station.getLogoUrl());
        assertFalse(station.isLive());
        assertFalse(station.isActive());
        assertEquals(0, station.getProgramsCount());
        assertEquals(0, station.getSubscribersCount());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        StationDto dto = new StationDto();
        dto.setId("station_1");
        dto.setName("إذاعة صنعاء");
        dto.setNameEn("Sana'a FM");
        dto.setTagline("صوت اليمنيين");
        dto.setDescription("إذاعة إخبارية وتثقيفية شاملة");
        dto.setStreamUrl("https://stream.example.com/live.aac");
        dto.setBackupStreamUrl("https://backup.example.com/live.aac");
        dto.setLogoUrl("https://img.example.com/logo.webp");
        dto.setThumbnailUrl("https://img.example.com/thumb.webp");
        dto.setFrequency("90.5 FM");
        dto.setCity("Sana'a");
        dto.setCountry("Yemen");
        dto.setTags(Arrays.asList("News", "Culture"));
        dto.setPriority(1);
        dto.setLive(true);
        dto.setActive(true);
        dto.setVerified(true);
        dto.setFeatured(true);

        Map<String, Long> stats = new HashMap<>();
        stats.put("programsCount", 12L);
        stats.put("subscribersCount", 4500L);
        stats.put("totalPlays", 98000L);
        dto.setStats(stats);

        Date now = new Date(1700000000000L);
        dto.setCreatedAt(new Timestamp(now));
        dto.setUpdatedAt(new Timestamp(now));

        Station station = StationMapper.toDomain(dto, null);

        assertNotNull(station);
        assertEquals("station_1", station.getId());
        assertEquals("إذاعة صنعاء", station.getName());
        assertEquals("Sana'a FM", station.getNameEn());
        assertEquals("صوت اليمنيين", station.getTagline());
        assertEquals("https://stream.example.com/live.aac", station.getStreamUrl());
        assertEquals("https://backup.example.com/live.aac", station.getBackupStreamUrl());
        assertEquals("https://img.example.com/logo.webp", station.getLogoUrl());
        assertEquals("https://img.example.com/thumb.webp", station.getThumbnailUrl());
        assertEquals("90.5 FM", station.getFrequency());
        assertEquals("Sana'a", station.getCity());
        assertEquals(2, station.getTags().size());
        assertEquals(1, station.getPriority());
        assertTrue(station.isLive());
        assertTrue(station.isActive());
        assertTrue(station.isVerified());
        assertTrue(station.isFeatured());
        assertEquals(12, station.getProgramsCount());
        assertEquals(4500, station.getSubscribersCount());
        assertEquals(98000, station.getTotalPlays());
        assertEquals(1700000000000L, station.getCreatedAtMillis());
    }

    @Test
    public void toDomainList_mapsListGracefully() {
        StationDto dto = new StationDto();
        dto.setId("s1");
        dto.setName("Station 1");

        List<Station> stations = StationMapper.toDomainList(Collections.singletonList(dto));

        assertNotNull(stations);
        assertEquals(1, stations.size());
        assertEquals("s1", stations.get(0).getId());
        assertEquals("Station 1", stations.get(0).getName());
    }
}
