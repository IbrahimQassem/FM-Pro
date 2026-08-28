package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.EpisodeDto;
import com.sana.dev.fm.domain.model.Episode;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Defensive null-safe mapper for EpisodeDto -> Episode domain model.
 */
public final class EpisodeMapper {

    private EpisodeMapper() {
    }

    public static Episode toDomain(EpisodeDto dto, String fallbackId) {
        if (dto == null) {
            return new Episode(
                    fallbackId != null ? fallbackId : "",
                    "", "", "", "", "", 0, 0, "", "", "",
                    false, false, 0, 0, 0, 0, 0, 0, 0
            );
        }

        String id = dto.getId() != null && !dto.getId().trim().isEmpty()
                ? dto.getId()
                : (fallbackId != null ? fallbackId : "");

        long publishedAtMillis = toMillis(dto.getPublishedAt());
        long broadcastDateMillis = toMillis(dto.getBroadcastDate());
        long createdAtMillis = toMillis(dto.getCreatedAt());

        Map<String, Long> stats = dto.getStats();
        int playsCount = getStat(stats, "playsCount");
        int likesCount = getStat(stats, "likesCount");
        int commentsCount = getStat(stats, "commentsCount");
        int downloadsCount = getStat(stats, "downloadsCount");

        return new Episode(
                id,
                dto.getProgramId(),
                dto.getStationId(),
                dto.getTitle(),
                dto.getDescription(),
                dto.getAudioUrl(),
                dto.getAudioDurationSec(),
                dto.getAudioSizeBytes(),
                dto.getCoverUrl(),
                dto.getPresenter(),
                dto.getGuest(),
                dto.isPublished(),
                dto.isFeatured(),
                playsCount,
                likesCount,
                commentsCount,
                downloadsCount,
                publishedAtMillis,
                broadcastDateMillis,
                createdAtMillis
        );
    }

    public static List<Episode> toDomainList(List<EpisodeDto> dtos) {
        if (dtos == null) return new ArrayList<>();
        List<Episode> list = new ArrayList<>(dtos.size());
        for (EpisodeDto dto : dtos) {
            if (dto != null) {
                list.add(toDomain(dto, null));
            }
        }
        return list;
    }

    private static int getStat(Map<String, Long> stats, String key) {
        if (stats == null || !stats.containsKey(key)) return 0;
        Long val = stats.get(key);
        return val != null ? (int) Math.max(0, val) : 0;
    }

    private static long toMillis(Timestamp timestamp) {
        if (timestamp == null) return 0;
        return timestamp.toDate().getTime();
    }
}
