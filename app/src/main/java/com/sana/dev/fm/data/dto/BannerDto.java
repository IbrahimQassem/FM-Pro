package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

import java.util.Map;

/**
 * Data Transfer Object for Firestore 'banners' documents.
 */
@IgnoreExtraProperties
public class BannerDto {
    @DocumentId
    private String id;
    private String title;
    private String imageUrl;
    private String targetUrl;
    private String targetType;
    private String targetId;
    private String placement;
    private int priority;
    private boolean isActive = true;
    private Map<String, Long> stats;

    private Timestamp startAt;
    private Timestamp expiresAt;
    @ServerTimestamp
    private Timestamp createdAt;

    public BannerDto() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getTargetUrl() { return targetUrl; }
    public void setTargetUrl(String targetUrl) { this.targetUrl = targetUrl; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }

    public String getPlacement() { return placement; }
    public void setPlacement(String placement) { this.placement = placement; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Map<String, Long> getStats() { return stats; }
    public void setStats(Map<String, Long> stats) { this.stats = stats; }

    public Timestamp getStartAt() { return startAt; }
    public void setStartAt(Timestamp startAt) { this.startAt = startAt; }

    public Timestamp getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Timestamp expiresAt) { this.expiresAt = expiresAt; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
