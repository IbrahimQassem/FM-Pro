package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

/**
 * Pure canonical domain model for a Radio Program.
 * Fully immutable, null-safe, with no Android or Firebase framework dependencies.
 */
public final class Program implements Serializable {
    private final String id;
    private final String radioId;
    private final String name;
    private final String description;
    private final List<String> categories;
    private final String tag;
    private final String profileImageUrl;
    private final int likesCount;
    private final int subscribeCount;
    private final int rateCount;
    private final int episodeCount;
    private final String timestamp;
    private final String createdBy;
    private final boolean disabled;
    private final String stopNote;
    private final ScheduleTime scheduleTime;

    public Program(String id,
                   String radioId,
                   String name,
                   String description,
                   List<String> categories,
                   String tag,
                   String profileImageUrl,
                   int likesCount,
                   int subscribeCount,
                   int rateCount,
                   int episodeCount,
                   String timestamp,
                   String createdBy,
                   boolean disabled,
                   String stopNote,
                   ScheduleTime scheduleTime) {
        this.id = id != null ? id : "";
        this.radioId = radioId != null ? radioId : "";
        this.name = name != null ? name : "";
        this.description = description != null ? description : "";
        this.categories = categories != null ? Collections.unmodifiableList(new ArrayList<>(categories)) : Collections.emptyList();
        this.tag = tag != null ? tag : "";
        this.profileImageUrl = profileImageUrl != null ? profileImageUrl : "";
        this.likesCount = Math.max(0, likesCount);
        this.subscribeCount = Math.max(0, subscribeCount);
        this.rateCount = Math.max(0, rateCount);
        this.episodeCount = Math.max(0, episodeCount);
        this.timestamp = timestamp != null ? timestamp : "";
        this.createdBy = createdBy != null ? createdBy : "";
        this.disabled = disabled;
        this.stopNote = stopNote != null ? stopNote : "";
        this.scheduleTime = scheduleTime != null ? scheduleTime : ScheduleTime.empty();
    }

    public String getId() {
        return id;
    }

    public String getRadioId() {
        return radioId;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public List<String> getCategories() {
        return categories;
    }

    public String getTag() {
        return tag;
    }

    public String getProfileImageUrl() {
        return profileImageUrl;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public int getSubscribeCount() {
        return subscribeCount;
    }

    public int getRateCount() {
        return rateCount;
    }

    public int getEpisodeCount() {
        return episodeCount;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public String getStopNote() {
        return stopNote;
    }

    public ScheduleTime getScheduleTime() {
        return scheduleTime;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Program program = (Program) o;
        return likesCount == program.likesCount &&
                subscribeCount == program.subscribeCount &&
                rateCount == program.rateCount &&
                episodeCount == program.episodeCount &&
                disabled == program.disabled &&
                Objects.equals(id, program.id) &&
                Objects.equals(radioId, program.radioId) &&
                Objects.equals(name, program.name) &&
                Objects.equals(description, program.description) &&
                Objects.equals(categories, program.categories) &&
                Objects.equals(tag, program.tag) &&
                Objects.equals(profileImageUrl, program.profileImageUrl) &&
                Objects.equals(timestamp, program.timestamp) &&
                Objects.equals(createdBy, program.createdBy) &&
                Objects.equals(stopNote, program.stopNote) &&
                Objects.equals(scheduleTime, program.scheduleTime);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, radioId, name, description, categories, tag, profileImageUrl,
                likesCount, subscribeCount, rateCount, episodeCount, timestamp, createdBy, disabled, stopNote, scheduleTime);
    }

    @Override
    public String toString() {
        return "Program{" +
                "id='" + id + '\'' +
                ", radioId='" + radioId + '\'' +
                ", name='" + name + '\'' +
                ", disabled=" + disabled +
                '}';
    }
}
