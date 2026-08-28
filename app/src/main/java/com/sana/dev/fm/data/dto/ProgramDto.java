package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object for Firestore 'programs' documents.
 */
@IgnoreExtraProperties
public class ProgramDto {
    @DocumentId
    private String id;
    private String stationId;
    private String title;
    private String titleEn;
    private String description;
    private String coverUrl;
    private String thumbnailUrl;
    private List<String> categories;
    private List<String> presenters;
    private Map<String, Object> schedule;
    private boolean isActive = true;
    private boolean isFeatured = false;
    private String statusNote;
    private Map<String, Long> stats;

    @ServerTimestamp
    private Timestamp createdAt;
    @ServerTimestamp
    private Timestamp updatedAt;

    public ProgramDto() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStationId() { return stationId; }
    public void setStationId(String stationId) { this.stationId = stationId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getTitleEn() { return titleEn; }
    public void setTitleEn(String titleEn) { this.titleEn = titleEn; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public List<String> getCategories() { return categories; }
    public void setCategories(List<String> categories) { this.categories = categories; }

    public List<String> getPresenters() { return presenters; }
    public void setPresenters(List<String> presenters) { this.presenters = presenters; }

    public Map<String, Object> getSchedule() { return schedule; }
    public void setSchedule(Map<String, Object> schedule) { this.schedule = schedule; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public boolean isFeatured() { return isFeatured; }
    public void setFeatured(boolean featured) { isFeatured = featured; }

    public String getStatusNote() { return statusNote; }
    public void setStatusNote(String statusNote) { this.statusNote = statusNote; }

    public Map<String, Long> getStats() { return stats; }
    public void setStats(Map<String, Long> stats) { this.stats = stats; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
