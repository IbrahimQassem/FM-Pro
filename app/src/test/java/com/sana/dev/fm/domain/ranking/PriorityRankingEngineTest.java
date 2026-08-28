package com.sana.dev.fm.domain.ranking;

import static org.junit.Assert.assertEquals;

import com.sana.dev.fm.domain.model.Banner;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.domain.model.Station;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.Episode;

import org.junit.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class PriorityRankingEngineTest {

    @Test
    public void testStationRanking_playableStreamAlwaysRanksHigher() {
        Station workingStation = new Station(
                "s1", "Working FM", "Working", "Tagline", "Desc",
                "https://stream.example.com/live", "", "logo", "thumb",
                "90.0", "Sana'a", "Yemen", Collections.emptyList(),
                10, true, true, false, false,
                0, 0, 0, 0L, 0L
        );

        Station brokenStationWithHighAdminPriority = new Station(
                "s2", "Silent FM", "Silent", "Tagline", "Desc",
                "", "", "logo", "thumb",
                "95.0", "Aden", "Yemen", Collections.emptyList(),
                99, false, true, false, false,
                0, 0, 0, 0L, 0L
        );

        List<Station> stations = Arrays.asList(brokenStationWithHighAdminPriority, workingStation);
        List<Station> sorted = PriorityRankingEngine.sortStations(stations);

        assertEquals("s1", sorted.get(0).getId());
        assertEquals("s2", sorted.get(1).getId());
    }

    @Test
    public void testStationRanking_featuredAndVerifiedRanksHigherWhenBothPlayable() {
        Station normalStation = new Station(
                "s1", "Normal FM", "Normal", "Tagline", "Desc",
                "https://stream.example.com/1", "", "logo", "thumb",
                "90.0", "Sana'a", "Yemen", Collections.emptyList(),
                50, true, true, false, false,
                2, 10, 100, 0L, 0L
        );

        Station featuredStation = new Station(
                "s2", "Featured FM", "Featured", "Tagline", "Desc",
                "https://stream.example.com/2", "", "logo", "thumb",
                "95.0", "Aden", "Yemen", Collections.emptyList(),
                50, true, true, true, true,
                2, 10, 100, 0L, 0L
        );

        List<Station> sorted = PriorityRankingEngine.sortStations(Arrays.asList(normalStation, featuredStation));
        assertEquals("s2", sorted.get(0).getId());
    }

    @Test
    public void testDestinationModelRanking() {
        DestinationModel d1 = new DestinationModel("1", "Radio A", "Sana'a", "http://image1.png", "desc", 4.5f, 0.0, 1, 10, Collections.emptyList(), "Sana'a");
        DestinationModel d2 = new DestinationModel("2", "Radio B", "Aden", "", "desc", 5.0f, 0.0, 1, 99, Collections.emptyList(), "Aden");

        List<DestinationModel> sorted = PriorityRankingEngine.sortDestinations(Arrays.asList(d2, d1));
        assertEquals("1", sorted.get(0).getId());
    }

    @Test
    public void testProgramRanking_engagementAndCurationBoost() {
        Program p1 = new Program("p1", "s1", "Morning Show", "Desc", Collections.emptyList(), "مميز", "", 100, 500, 5, 10, "", "", false, "", ScheduleTime.empty());
        Program p2 = new Program("p2", "s1", "Regular Show", "Desc", Collections.emptyList(), "", "", 10, 50, 3, 2, "", "", false, "", ScheduleTime.empty());

        List<Program> sorted = PriorityRankingEngine.sortPrograms(Arrays.asList(p2, p1));
        assertEquals("p1", sorted.get(0).getId());
    }

    @Test
    public void testEpisodeRanking_featuredAndStreamAvailability() {
        Episode ep1 = new Episode();
        ep1.setEpId("ep1");
        ep1.setEpName("Episode 1");
        ep1.setEpStreamUrl("https://audio.example.com/1.mp3");
        ep1.setFeatured(true);
        ep1.setLikesCount(100);

        Episode ep2 = new Episode();
        ep2.setEpId("ep2");
        ep2.setEpName("Episode 2");
        ep2.setEpStreamUrl("");
        ep2.setFeatured(false);
        ep2.setLikesCount(10);

        List<Episode> sorted = PriorityRankingEngine.sortEpisodes(Arrays.asList(ep2, ep1));
        assertEquals("ep1", sorted.get(0).getEpId());
    }

    @Test
    public void testBannerRanking_priorityAndClicks() {
        Banner b1 = new Banner("b1", "Title 1", "image", "action", "EXTERNAL_URL", "target1", "placement", 50, true, 100, 20, 0L, 0L, 0L);
        Banner b2 = new Banner("b2", "Title 2", "image", "action", "EXTERNAL_URL", "target2", "placement", 10, true, 100, 5, 0L, 0L, 0L);

        List<Banner> sorted = PriorityRankingEngine.sortBanners(Arrays.asList(b2, b1));
        assertEquals("b1", sorted.get(0).getId());
    }
}
