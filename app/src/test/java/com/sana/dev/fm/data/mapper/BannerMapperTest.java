package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.BannerDto;
import com.sana.dev.fm.domain.model.Banner;

import org.junit.Test;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class BannerMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyBanner() {
        Banner banner = BannerMapper.toDomain(null, "banner_fallback");

        assertNotNull(banner);
        assertEquals("banner_fallback", banner.getId());
        assertEquals("", banner.getTitle());
        assertEquals("EXTERNAL_URL", banner.getTargetType());
        assertFalse(banner.isActive());
        assertEquals(0, banner.getImpressionsCount());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        BannerDto dto = new BannerDto();
        dto.setId("banner_55");
        dto.setTitle("حفل إطلاق الموسم الجديد");
        dto.setImageUrl("https://img.example.com/banner55.webp");
        dto.setTargetUrl("https://fmpro.example.com/season2");
        dto.setTargetType("PROGRAM");
        dto.setTargetId("prog_999");
        dto.setPlacement("HOME_TOP");
        dto.setPriority(2);
        dto.setActive(true);

        Map<String, Long> stats = new HashMap<>();
        stats.put("impressionsCount", 5200L);
        stats.put("clicksCount", 480L);
        dto.setStats(stats);

        Date start = new Date(1710000000000L);
        Date expiry = new Date(1720000000000L);
        Date created = new Date(1705000000000L);

        dto.setStartAt(new Timestamp(start));
        dto.setExpiresAt(new Timestamp(expiry));
        dto.setCreatedAt(new Timestamp(created));

        Banner banner = BannerMapper.toDomain(dto, null);

        assertNotNull(banner);
        assertEquals("banner_55", banner.getId());
        assertEquals("حفل إطلاق الموسم الجديد", banner.getTitle());
        assertEquals("https://img.example.com/banner55.webp", banner.getImageUrl());
        assertEquals("https://fmpro.example.com/season2", banner.getTargetUrl());
        assertEquals("PROGRAM", banner.getTargetType());
        assertEquals("prog_999", banner.getTargetId());
        assertEquals("HOME_TOP", banner.getPlacement());
        assertEquals(2, banner.getPriority());
        assertTrue(banner.isActive());
        assertEquals(5200, banner.getImpressionsCount());
        assertEquals(480, banner.getClicksCount());
        assertEquals(1710000000000L, banner.getStartAtMillis());
        assertEquals(1720000000000L, banner.getExpiresAtMillis());
        assertEquals(1705000000000L, banner.getCreatedAtMillis());
    }
}
