package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.domain.model.Station;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Defensive null-safe mapper for StationDto -> Station domain model.
 */
public final class StationMapper {

    private StationMapper() {
    }

    public static Station toDomain(StationDto dto, String fallbackId) {
        if (dto == null) {
            return new Station(
                    fallbackId != null ? fallbackId : "",
                    "", "", "", "", "", "", "", "", "", "", "",
                    null, 0, false, false, false, false, 0, 0, 0, 0, 0
            );
        }

        String id = dto.getId() != null && !dto.getId().trim().isEmpty()
                ? dto.getId()
                : (fallbackId != null ? fallbackId : "");

        long createdAtMillis = toMillis(dto.getCreatedAt());
        long updatedAtMillis = toMillis(dto.getUpdatedAt());

        Map<String, Long> stats = dto.getStats();
        int programsCount = getStat(stats, "programsCount");
        int subscribersCount = getStat(stats, "subscribersCount");
        int totalPlays = getStat(stats, "totalPlays");

        return new Station(
                id,
                dto.getName(),
                dto.getNameEn(),
                dto.getTagline(),
                dto.getDescription(),
                dto.getStreamUrl(),
                dto.getBackupStreamUrl(),
                dto.getLogoUrl(),
                dto.getThumbnailUrl(),
                dto.getFrequency(),
                dto.getCity(),
                dto.getCountry(),
                dto.getTags(),
                dto.getPriority(),
                dto.isLive(),
                dto.isActive(),
                dto.isVerified(),
                dto.isFeatured(),
                programsCount,
                subscribersCount,
                totalPlays,
                createdAtMillis,
                updatedAtMillis
        );
    }

    public static List<Station> toDomainList(List<StationDto> dtos) {
        if (dtos == null) return new ArrayList<>();
        List<Station> list = new ArrayList<>(dtos.size());
        for (StationDto dto : dtos) {
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
