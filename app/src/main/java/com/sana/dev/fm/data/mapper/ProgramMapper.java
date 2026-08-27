package com.sana.dev.fm.data.mapper;

import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;
import com.sana.dev.fm.model.RadioProgram;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Defensive mapper converting between legacy/DTO RadioProgram objects and canonical Program domain entities.
 * Sanitizes input fields to eliminate null or corrupted values.
 */
public final class ProgramMapper {

    private ProgramMapper() {
    }

    /**
     * Converts a legacy RadioProgram model to an immutable canonical Program entity.
     */
    public static Program toDomain(RadioProgram dto) {
        if (dto == null) {
            return new Program("", "", "", "", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        }

        String programId = dto.getProgramId() != null ? dto.getProgramId().trim() : "";
        String radioId = dto.getRadioId() != null ? dto.getRadioId().trim() : "";
        String name = dto.getPrName() != null ? dto.getPrName().trim() : "";
        String desc = dto.getPrDesc() != null ? dto.getPrDesc().trim() : "";
        List<String> categories = dto.getPrCategoryList() != null ? dto.getPrCategoryList() : Collections.emptyList();
        String tag = dto.getPrTag() != null ? dto.getPrTag().trim() : "";
        String profile = dto.getPrProfile() != null ? dto.getPrProfile().trim() : "";
        int likes = Math.max(0, dto.getLikesCount());
        int subs = Math.max(0, dto.getSubscribeCount());
        int rate = Math.max(0, dto.getRateCount());
        int episodes = Math.max(0, dto.getEpisodeCount());
        String timestamp = dto.getTimestamp() != null ? dto.getTimestamp().trim() : "";
        String createdBy = dto.getCreateBy() != null ? dto.getCreateBy().trim() : "";
        boolean disabled = dto.isDisabled();
        String stopNote = dto.getStopNote() != null ? dto.getStopNote().trim() : "";
        ScheduleTime scheduleTime = ScheduleMapper.toDomain(dto.getProgramScheduleTime());

        return new Program(
                programId,
                radioId,
                name,
                desc,
                categories,
                tag,
                profile,
                likes,
                subs,
                rate,
                episodes,
                timestamp,
                createdBy,
                disabled,
                stopNote,
                scheduleTime
        );
    }

    /**
     * Converts a canonical Program entity back to a legacy RadioProgram for compatibility with existing UI/adapters.
     */
    public static RadioProgram toDto(Program domain) {
        if (domain == null) {
            return new RadioProgram();
        }

        RadioProgram dto = new RadioProgram(
                domain.getId(),
                domain.getRadioId(),
                domain.getName(),
                domain.getDescription(),
                new ArrayList<>(domain.getCategories()),
                domain.getTag(),
                domain.getProfileImageUrl(),
                domain.getLikesCount(),
                domain.getSubscribeCount(),
                domain.getRateCount(),
                domain.getTimestamp(),
                domain.getCreatedBy(),
                domain.isDisabled(),
                domain.getStopNote(),
                ScheduleMapper.toDto(domain.getScheduleTime())
        );
        dto.setEpisodeCount(domain.getEpisodeCount());
        return dto;
    }

    /**
     * Converts a raw map (e.g. from Firestore document data) to a canonical Program entity safely.
     */
    public static Program fromMap(String documentId, Map<String, Object> map) {
        if (map == null) {
            return new Program(documentId != null ? documentId : "", "", "", "", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        }

        String programId = documentId != null ? documentId : getString(map, "programId");
        String radioId = getString(map, "radioId");
        String name = getString(map, "prName");
        if (name.isEmpty()) {
            name = getString(map, "name");
        }
        String desc = getString(map, "prDesc");
        if (desc.isEmpty()) {
            desc = getString(map, "description");
        }
        List<String> categories = getList(map, "prCategoryList");
        String tag = getString(map, "prTag");
        String profile = getString(map, "prProfile");
        int likes = getInt(map, "likesCount");
        int subs = getInt(map, "subscribeCount");
        int rate = getInt(map, "rateCount");
        int episodes = getInt(map, "episodeCount");
        String timestamp = getString(map, "timestamp");
        String createdBy = getString(map, "createBy");
        boolean disabled = getBoolean(map, "disabled");
        String stopNote = getString(map, "stopNote");

        return new Program(
                programId,
                radioId,
                name,
                desc,
                categories,
                tag,
                profile,
                likes,
                subs,
                rate,
                episodes,
                timestamp,
                createdBy,
                disabled,
                stopNote,
                ScheduleTime.empty()
        );
    }

    private static String getString(Map<String, Object> map, String key) {
        Object val = map.get(key);
        return val instanceof String ? ((String) val).trim() : "";
    }

    private static int getInt(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Number) {
            return ((Number) val).intValue();
        }
        return 0;
    }

    private static boolean getBoolean(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof Boolean) {
            return (Boolean) val;
        }
        return false;
    }

    @SuppressWarnings("unchecked")
    private static List<String> getList(Map<String, Object> map, String key) {
        Object val = map.get(key);
        if (val instanceof List) {
            return (List<String>) val;
        }
        return Collections.emptyList();
    }
}
