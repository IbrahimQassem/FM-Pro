package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;

import java.util.Date;
import java.util.Map;

/**
 * Defensive Data Transfer Object for Firestore 'banners' / 'advertisement' documents.
 * Handles diverse legacy field types safely (Timestamp, Long, String, or Date).
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

    private Object startAt;
    private Object expiresAt;
    private Object createdAt;

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

    public Object getStartAt() { return startAt; }
    public void setStartAt(Object startAt) { this.startAt = startAt; }

    public Object getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Object expiresAt) { this.expiresAt = expiresAt; }

    public Object getCreatedAt() { return createdAt; }
    public void setCreatedAt(Object createdAt) { this.createdAt = createdAt; }

    public static Timestamp toTimestamp(Object val) {
        if (val == null) return null;
        if (val instanceof Timestamp) return (Timestamp) val;
        if (val instanceof Date) return new Timestamp((Date) val);
        if (val instanceof Number) return new Timestamp(new Date(((Number) val).longValue()));
        if (val instanceof String) {
            try {
                long millis = Long.parseLong((String) val);
                return new Timestamp(new Date(millis));
            } catch (Exception ignored) {
            }
        }
        return null;
    }
}
