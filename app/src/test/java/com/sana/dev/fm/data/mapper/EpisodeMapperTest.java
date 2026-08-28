package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.EpisodeDto;
import com.sana.dev.fm.domain.model.Episode;

import org.junit.Test;

import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class EpisodeMapperTest {

    @Test
    public void toDomain_withNullDto_returnsSafeEmptyEpisode() {
        Episode episode = EpisodeMapper.toDomain(null, "ep_fallback");

        assertNotNull(episode);
        assertEquals("ep_fallback", episode.getId());
        assertEquals("", episode.getTitle());
        assertEquals("", episode.getAudioUrl());
        assertEquals(0, episode.getAudioDurationSec());
        assertFalse(episode.isPublished());
        assertEquals(0, episode.getPlaysCount());
    }

    @Test
    public void toDomain_withCompleteDto_mapsAllFieldsCorrectly() {
        EpisodeDto dto = new EpisodeDto();
        dto.setId("ep_101");
        dto.setProgramId("prog_202");
        dto.setStationId("station_303");
        dto.setTitle("حلقة خاصة عن التراث");
        dto.setDescription("مناقشة التراث الشعبي وتطوره");
        dto.setAudioUrl("https://audio.example.com/ep101.mp3");
        dto.setAudioDurationSec(1840);
        dto.setAudioSizeBytes(24500000);
        dto.setCoverUrl("https://img.example.com/ep101.webp");
        dto.setPresenter("أحمد محمد");
        dto.setGuest("د. علي اليماني");
        dto.setPublished(true);
        dto.setFeatured(true);

        Map<String, Long> stats = new HashMap<>();
        stats.put("playsCount", 1250L);
        stats.put("likesCount", 340L);
        stats.put("commentsCount", 45L);
        stats.put("downloadsCount", 180L);
        dto.setStats(stats);

        Date now = new Date(1700000000000L);
        dto.setPublishedAt(new Timestamp(now));
        dto.setBroadcastDate(new Timestamp(now));
        dto.setCreatedAt(new Timestamp(now));

        Episode episode = EpisodeMapper.toDomain(dto, null);

        assertNotNull(episode);
        assertEquals("ep_101", episode.getId());
        assertEquals("prog_202", episode.getProgramId());
        assertEquals("station_303", episode.getStationId());
        assertEquals("حلقة خاصة عن التراث", episode.getTitle());
        assertEquals("https://audio.example.com/ep101.mp3", episode.getAudioUrl());
        assertEquals(1840, episode.getAudioDurationSec());
        assertEquals(24500000, episode.getAudioSizeBytes());
        assertEquals("https://img.example.com/ep101.webp", episode.getCoverUrl());
        assertEquals("أحمد محمد", episode.getPresenter());
        assertEquals("د. علي اليماني", episode.getGuest());
        assertTrue(episode.isPublished());
        assertTrue(episode.isFeatured());
        assertEquals(1250, episode.getPlaysCount());
        assertEquals(340, episode.getLikesCount());
        assertEquals(45, episode.getCommentsCount());
        assertEquals(180, episode.getDownloadsCount());
        assertEquals(1700000000000L, episode.getPublishedAtMillis());
    }

    @Test
    public void toDomainList_mapsListGracefully() {
        EpisodeDto dto = new EpisodeDto();
        dto.setId("ep_x");
        dto.setTitle("Episode X");

        List<Episode> list = EpisodeMapper.toDomainList(Collections.singletonList(dto));

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("ep_x", list.get(0).getId());
    }
}
