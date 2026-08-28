package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.BannerDto;
import com.sana.dev.fm.domain.model.Banner;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Defensive null-safe mapper for BannerDto -> Banner domain model.
 */
public final class BannerMapper {

    private BannerMapper() {
    }

    public static Banner toDomain(BannerDto dto, String fallbackId) {
        if (dto == null) {
            return new Banner(
                    fallbackId != null ? fallbackId : "",
                    "", "", "", "EXTERNAL_URL", "", "HOME_TOP",
                    0, false, 0, 0, 0, 0, 0
            );
        }

        String id = dto.getId() != null && !dto.getId().trim().isEmpty()
                ? dto.getId()
                : (fallbackId != null ? fallbackId : "");

        long startAtMillis = toMillis(dto.getStartAt());
        long expiresAtMillis = toMillis(dto.getExpiresAt());
        long createdAtMillis = toMillis(dto.getCreatedAt());

        Map<String, Long> stats = dto.getStats();
        int impressionsCount = getStat(stats, "impressionsCount");
        int clicksCount = getStat(stats, "clicksCount");

        return new Banner(
                id,
                dto.getTitle(),
                dto.getImageUrl(),
                dto.getTargetUrl(),
                dto.getTargetType(),
                dto.getTargetId(),
                dto.getPlacement(),
                dto.getPriority(),
                dto.isActive(),
                impressionsCount,
                clicksCount,
                startAtMillis,
                expiresAtMillis,
                createdAtMillis
        );
    }

    public static List<Banner> toDomainList(List<BannerDto> dtos) {
        if (dtos == null) return new ArrayList<>();
        List<Banner> list = new ArrayList<>(dtos.size());
        for (BannerDto dto : dtos) {
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

    private static long toMillis(Object timestampObj) {
        if (timestampObj == null) return 0;
        Timestamp timestamp = BannerDto.toTimestamp(timestampObj);
        if (timestamp == null) return 0;
        return timestamp.toDate().getTime();
    }
}
