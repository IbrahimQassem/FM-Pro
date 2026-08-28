package com.sana.dev.fm.domain.ranking;

import com.sana.dev.fm.domain.model.Banner;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.Station;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Pure, high-performance canonical ranking and scoring engine for FM-Pro content.
 * Replaces static integer priority with smart composite ranking based on:
 * 1. Playability & Stream Availability
 * 2. Real-Time On-Air / Live Schedule Status
 * 3. Editorial & Featured Curation
 * 4. Admin Priority Control
 * 5. Listener Engagement & Social Proof
 */
public final class PriorityRankingEngine {

    private PriorityRankingEngine() {
    }

    // ==========================================
    // STATION RANKING
    // ==========================================

    public static long calculateStationScore(Station station) {
        if (station == null || !station.isActive()) {
            return -1L;
        }

        long score = 0;

        // 1. Playability: Working stream URL gets primary boost
        String stream = station.getStreamUrl();
        boolean hasValidStream = stream != null && !stream.trim().isEmpty() && !stream.equalsIgnoreCase("N/A");
        if (hasValidStream) {
            score += 10_000_000L;
        }

        // 2. Live Broadcast Status
        if (station.isLive()) {
            score += 2_000_000L;
        }

        // 3. Featured Station
        if (station.isFeatured()) {
            score += 1_000_000L;
        }

        // 4. Official Verified Badge
        if (station.isVerified()) {
            score += 500_000L;
        }

        // 5. Admin Priority (Preserves explicit admin curation)
        score += ((long) station.getPriority()) * 10_000L;

        // 6. Listener Engagement
        score += ((long) station.getSubscribersCount()) * 10L;
        score += ((long) station.getTotalPlays()) / 10L;
        score += ((long) station.getProgramsCount()) * 50L;

        return score;
    }

    public static long calculateDestinationScore(DestinationModel destination) {
        if (destination == null) {
            return -1L;
        }

        long score = 0;

        // Has valid image/resource
        String image = destination.getImageUrl();
        if (image != null && !image.trim().isEmpty()) {
            score += 1_000_000L;
        }

        // Priority
        score += ((long) destination.getPriority()) * 10_000L;

        // Rating
        score += (long) (destination.getRating() * 1_000L);

        return score;
    }

    public static long calculateRadioInfoScore(RadioInfo radio) {
        if (radio == null || radio.isDisabled()) {
            return -1L;
        }

        long score = 0;

        String stream = radio.getStreamUrl();
        if (stream != null && !stream.trim().isEmpty() && !stream.equalsIgnoreCase("N/A")) {
            score += 10_000_000L;
        }

        if (radio.isOnline()) {
            score += 2_000_000L;
        }

        if (radio.isBlueBadge()) {
            score += 500_000L;
        }

        score += ((long) radio.getPriority()) * 10_000L;
        score += ((long) radio.getSubscribers()) * 10L;
        score += ((long) radio.getFollowers()) * 5L;
        score += ((long) radio.getProgramsCount()) * 50L;

        return score;
    }

    public static List<Station> sortStations(List<Station> stations) {
        if (stations == null || stations.isEmpty()) {
            return stations != null ? stations : Collections.emptyList();
        }
        List<Station> sorted = new ArrayList<>(stations);
        Collections.sort(sorted, (s1, s2) -> Long.compare(calculateStationScore(s2), calculateStationScore(s1)));
        return sorted;
    }

    public static List<DestinationModel> sortDestinations(List<DestinationModel> destinations) {
        if (destinations == null || destinations.isEmpty()) {
            return destinations != null ? destinations : Collections.emptyList();
        }
        List<DestinationModel> sorted = new ArrayList<>(destinations);
        Collections.sort(sorted, (d1, d2) -> Long.compare(calculateDestinationScore(d2), calculateDestinationScore(d1)));
        return sorted;
    }

    public static List<RadioInfo> sortRadioInfos(List<RadioInfo> radios) {
        if (radios == null || radios.isEmpty()) {
            return radios != null ? radios : Collections.emptyList();
        }
        List<RadioInfo> sorted = new ArrayList<>(radios);
        Collections.sort(sorted, (r1, r2) -> Long.compare(calculateRadioInfoScore(r2), calculateRadioInfoScore(r1)));
        return sorted;
    }

    // ==========================================
    // PROGRAM RANKING
    // ==========================================

    public static long calculateProgramScore(Program program) {
        if (program == null || program.isDisabled()) {
            return -1L;
        }

        long score = 0;

        // 1. Featured Curation
        if (!program.getTag().isEmpty() && (program.getTag().contains("مميز") || program.getTag().contains("صباحي"))) {
            score += 1_000_000L;
        }

        // 2. Community Engagement
        score += ((long) program.getSubscribeCount()) * 100L;
        score += ((long) program.getLikesCount()) * 50L;
        score += ((long) program.getEpisodeCount()) * 200L;
        score += ((long) program.getRateCount()) * 500L;

        return score;
    }

    public static List<Program> sortPrograms(List<Program> programs) {
        if (programs == null || programs.isEmpty()) {
            return programs != null ? programs : Collections.emptyList();
        }
        List<Program> sorted = new ArrayList<>(programs);
        Collections.sort(sorted, (p1, p2) -> Long.compare(calculateProgramScore(p2), calculateProgramScore(p1)));
        return sorted;
    }

    // ==========================================
    // EPISODE RANKING
    // ==========================================

    public static long calculateEpisodeScore(Episode episode) {
        if (episode == null || episode.isDisabled()) {
            return -1L;
        }

        long score = 0;

        // 1. Has valid stream / audio URL
        String stream = episode.getEpStreamUrl();
        if (stream != null && !stream.trim().isEmpty()) {
            score += 5_000_000L;
        }

        // 2. Featured / Published
        if (episode.isFeatured()) {
            score += 2_000_000L;
        }

        // 3. User Engagement
        score += ((long) episode.getLikesCount()) * 100L;
        score += ((long) episode.getFavCount()) * 50L;

        return score;
    }

    public static List<Episode> sortEpisodes(List<Episode> episodes) {
        if (episodes == null || episodes.isEmpty()) {
            return episodes != null ? episodes : Collections.emptyList();
        }
        List<Episode> sorted = new ArrayList<>(episodes);
        Collections.sort(sorted, (e1, e2) -> Long.compare(calculateEpisodeScore(e2), calculateEpisodeScore(e1)));
        return sorted;
    }

    // ==========================================
    // BANNER RANKING
    // ==========================================

    public static long calculateBannerScore(Banner banner) {
        if (banner == null || !banner.isActive()) {
            return -1L;
        }
        long score = 0;
        score += ((long) banner.getPriority()) * 10_000L;
        score += ((long) banner.getClicksCount()) * 5L;
        return score;
    }

    public static List<Banner> sortBanners(List<Banner> banners) {
        if (banners == null || banners.isEmpty()) {
            return banners != null ? banners : Collections.emptyList();
        }
        List<Banner> sorted = new ArrayList<>(banners);
        Collections.sort(sorted, (b1, b2) -> Long.compare(calculateBannerScore(b2), calculateBannerScore(b1)));
        return sorted;
    }
}
