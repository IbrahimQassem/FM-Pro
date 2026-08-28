package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

import java.util.List;
import java.util.Map;

/**
 * Data Transfer Object for Firestore 'stations' documents.
 */
@IgnoreExtraProperties
public class StationDto {
    @DocumentId
    private String id;
    private String name;
    private String nameEn;
    private String tagline;
    private String description;
    private String streamUrl;
    private String backupStreamUrl;
    private String logoUrl;
    private String thumbnailUrl;
    private String frequency;
    private String city;
    private String country;
    private List<String> tags;
    private int priority;
    private boolean isLive = true;
    private boolean isActive = true;
    private boolean isVerified = false;
    private boolean isFeatured = false;
    private Map<String, Long> stats;

    @ServerTimestamp
    private Timestamp createdAt;
    @ServerTimestamp
    private Timestamp updatedAt;

    public StationDto() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getNameEn() { return nameEn; }
    public void setNameEn(String nameEn) { this.nameEn = nameEn; }

    public String getTagline() { return tagline; }
    public void setTagline(String tagline) { this.tagline = tagline; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStreamUrl() { return streamUrl; }
    public void setStreamUrl(String streamUrl) { this.streamUrl = streamUrl; }

    public String getBackupStreamUrl() { return backupStreamUrl; }
    public void setBackupStreamUrl(String backupStreamUrl) { this.backupStreamUrl = backupStreamUrl; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getCountry() { return country; }
    public void setCountry(String country) { this.country = country; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }

    public boolean isLive() { return isLive; }
    public void setLive(boolean live) { isLive = live; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public boolean isVerified() { return isVerified; }
    public void setVerified(boolean verified) { isVerified = verified; }

    public boolean isFeatured() { return isFeatured; }
    public void setFeatured(boolean featured) { isFeatured = featured; }

    public Map<String, Long> getStats() { return stats; }
    public void setStats(Map<String, Long> stats) { this.stats = stats; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
