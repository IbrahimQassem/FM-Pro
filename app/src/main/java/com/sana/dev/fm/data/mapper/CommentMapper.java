package com.sana.dev.fm.data.mapper;

import com.google.firebase.Timestamp;
import com.sana.dev.fm.data.dto.CommentDto;
import com.sana.dev.fm.domain.model.Comment;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Defensive null-safe mapper for CommentDto -> Comment domain model.
 */
public final class CommentMapper {

    private CommentMapper() {
    }

    public static Comment toDomain(CommentDto dto, String fallbackId) {
        if (dto == null) {
            return new Comment(
                    fallbackId != null ? fallbackId : "",
                    "", "", "", "", false, "", 0, false, "visible", 0, 0
            );
        }

        String id = dto.getId() != null && !dto.getId().trim().isEmpty()
                ? dto.getId()
                : (fallbackId != null ? fallbackId : "");

        long createdAtMillis = toMillis(dto.getCreatedAt());
        long updatedAtMillis = toMillis(dto.getUpdatedAt());

        Map<String, Object> author = dto.getAuthor();
        String authorUid = getMapString(author, "uid");
        String authorName = getMapString(author, "displayName");
        String authorAvatarUrl = getMapString(author, "avatarUrl");
        boolean isAuthorVerified = getMapBoolean(author, "isVerified");

        return new Comment(
                id,
                dto.getEpisodeId(),
                authorUid,
                authorName,
                authorAvatarUrl,
                isAuthorVerified,
                dto.getContent(),
                dto.getLikesCount(),
                dto.isEdited(),
                dto.getStatus(),
                createdAtMillis,
                updatedAtMillis
        );
    }

    public static List<Comment> toDomainList(List<CommentDto> dtos) {
        if (dtos == null) return new ArrayList<>();
        List<Comment> list = new ArrayList<>(dtos.size());
        for (CommentDto dto : dtos) {
            if (dto != null) {
                list.add(toDomain(dto, null));
            }
        }
        return list;
    }

    private static String getMapString(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key)) return "";
        Object val = map.get(key);
        return val instanceof String ? (String) val : "";
    }

    private static boolean getMapBoolean(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key)) return false;
        Object val = map.get(key);
        return val instanceof Boolean && (Boolean) val;
    }

    private static long toMillis(Timestamp timestamp) {
        if (timestamp == null) return 0;
        return timestamp.toDate().getTime();
    }
}
