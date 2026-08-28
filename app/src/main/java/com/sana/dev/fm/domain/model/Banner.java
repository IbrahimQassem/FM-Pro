package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Pure canonical domain model for a Banner/Advertisement.
 * Immutable, null-safe, with no Android/Firebase framework dependencies.
 */
public final class Banner implements Serializable {
    private final String id;
    private final String title;
    private final String imageUrl;
    private final String targetUrl;
    private final String targetType;
    private final String targetId;
    private final String placement;
    private final int priority;
    private final boolean isActive;
    private final int impressionsCount;
    private final int clicksCount;
    private final long startAtMillis;
    private final long expiresAtMillis;
    private final long createdAtMillis;

    public Banner(String id,
                  String title,
                  String imageUrl,
                  String targetUrl,
                  String targetType,
                  String targetId,
                  String placement,
                  int priority,
                  boolean isActive,
                  int impressionsCount,
                  int clicksCount,
                  long startAtMillis,
                  long expiresAtMillis,
                  long createdAtMillis) {
        this.id = id != null ? id : "";
        this.title = title != null ? title : "";
        this.imageUrl = imageUrl != null ? imageUrl : "";
        this.targetUrl = targetUrl != null ? targetUrl : "";
        this.targetType = targetType != null ? targetType : "EXTERNAL_URL";
        this.targetId = targetId != null ? targetId : "";
        this.placement = placement != null ? placement : "HOME_TOP";
        this.priority = priority;
        this.isActive = isActive;
        this.impressionsCount = Math.max(0, impressionsCount);
        this.clicksCount = Math.max(0, clicksCount);
        this.startAtMillis = Math.max(0, startAtMillis);
        this.expiresAtMillis = Math.max(0, expiresAtMillis);
        this.createdAtMillis = Math.max(0, createdAtMillis);
    }

    public String getId() { return id; }
    public String getTitle() { return title; }
    public String getImageUrl() { return imageUrl; }
    public String getTargetUrl() { return targetUrl; }
    public String getTargetType() { return targetType; }
    public String getTargetId() { return targetId; }
    public String getPlacement() { return placement; }
    public int getPriority() { return priority; }
    public boolean isActive() { return isActive; }
    public int getImpressionsCount() { return impressionsCount; }
    public int getClicksCount() { return clicksCount; }
    public long getStartAtMillis() { return startAtMillis; }
    public long getExpiresAtMillis() { return expiresAtMillis; }
    public long getCreatedAtMillis() { return createdAtMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Banner banner = (Banner) o;
        return priority == banner.priority &&
                isActive == banner.isActive &&
                impressionsCount == banner.impressionsCount &&
                clicksCount == banner.clicksCount &&
                startAtMillis == banner.startAtMillis &&
                expiresAtMillis == banner.expiresAtMillis &&
                createdAtMillis == banner.createdAtMillis &&
                Objects.equals(id, banner.id) &&
                Objects.equals(title, banner.title) &&
                Objects.equals(imageUrl, banner.imageUrl) &&
                Objects.equals(targetUrl, banner.targetUrl) &&
                Objects.equals(targetType, banner.targetType) &&
                Objects.equals(targetId, banner.targetId) &&
                Objects.equals(placement, banner.placement);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, title, imageUrl, targetUrl, targetType, targetId,
                placement, priority, isActive, impressionsCount, clicksCount,
                startAtMillis, expiresAtMillis, createdAtMillis);
    }

    @Override
    public String toString() {
        return "Banner{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", placement='" + placement + '\'' +
                ", isActive=" + isActive +
                '}';
    }
}
