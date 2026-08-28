package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Pure canonical domain model for a Radio Station.
 * Immutable, null-safe, with no Android/Firebase framework dependencies.
 */
public final class Station implements Serializable {
    private final String id;
    private final String name;
    private final String nameEn;
    private final String tagline;
    private final String description;
    private final String streamUrl;
    private final String backupStreamUrl;
    private final String logoUrl;
    private final String thumbnailUrl;
    private final String frequency;
    private final String city;
    private final String country;
    private final List<String> tags;
    private final int priority;
    private final boolean isLive;
    private final boolean isActive;
    private final boolean isVerified;
    private final boolean isFeatured;
    private final int programsCount;
    private final int subscribersCount;
    private final int totalPlays;
    private final long createdAtMillis;
    private final long updatedAtMillis;

    public Station(String id,
                   String name,
                   String nameEn,
                   String tagline,
                   String description,
                   String streamUrl,
                   String backupStreamUrl,
                   String logoUrl,
                   String thumbnailUrl,
                   String frequency,
                   String city,
                   String country,
                   List<String> tags,
                   int priority,
                   boolean isLive,
                   boolean isActive,
                   boolean isVerified,
                   boolean isFeatured,
                   int programsCount,
                   int subscribersCount,
                   int totalPlays,
                   long createdAtMillis,
                   long updatedAtMillis) {
        this.id = id != null ? id : "";
        this.name = name != null ? name : "";
        this.nameEn = nameEn != null ? nameEn : "";
        this.tagline = tagline != null ? tagline : "";
        this.description = description != null ? description : "";
        this.streamUrl = streamUrl != null ? streamUrl : "";
        this.backupStreamUrl = backupStreamUrl != null ? backupStreamUrl : "";
        this.logoUrl = logoUrl != null ? logoUrl : "";
        this.thumbnailUrl = thumbnailUrl != null ? thumbnailUrl : "";
        this.frequency = frequency != null ? frequency : "";
        this.city = city != null ? city : "";
        this.country = country != null ? country : "";
        this.tags = tags != null ? Collections.unmodifiableList(new ArrayList<>(tags)) : Collections.emptyList();
        this.priority = priority;
        this.isLive = isLive;
        this.isActive = isActive;
        this.isVerified = isVerified;
        this.isFeatured = isFeatured;
        this.programsCount = Math.max(0, programsCount);
        this.subscribersCount = Math.max(0, subscribersCount);
        this.totalPlays = Math.max(0, totalPlays);
        this.createdAtMillis = Math.max(0, createdAtMillis);
        this.updatedAtMillis = Math.max(0, updatedAtMillis);
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getNameEn() { return nameEn; }
    public String getTagline() { return tagline; }
    public String getDescription() { return description; }
    public String getStreamUrl() { return streamUrl; }
    public String getBackupStreamUrl() { return backupStreamUrl; }
    public String getLogoUrl() { return logoUrl; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public String getFrequency() { return frequency; }
    public String getCity() { return city; }
    public String getCountry() { return country; }
    public List<String> getTags() { return tags; }
    public int getPriority() { return priority; }
    public boolean isLive() { return isLive; }
    public boolean isActive() { return isActive; }
    public boolean isVerified() { return isVerified; }
    public boolean isFeatured() { return isFeatured; }
    public int getProgramsCount() { return programsCount; }
    public int getSubscribersCount() { return subscribersCount; }
    public int getTotalPlays() { return totalPlays; }
    public long getCreatedAtMillis() { return createdAtMillis; }
    public long getUpdatedAtMillis() { return updatedAtMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Station station = (Station) o;
        return priority == station.priority &&
                isLive == station.isLive &&
                isActive == station.isActive &&
                isVerified == station.isVerified &&
                isFeatured == station.isFeatured &&
                programsCount == station.programsCount &&
                subscribersCount == station.subscribersCount &&
                totalPlays == station.totalPlays &&
                createdAtMillis == station.createdAtMillis &&
                updatedAtMillis == station.updatedAtMillis &&
                Objects.equals(id, station.id) &&
                Objects.equals(name, station.name) &&
                Objects.equals(nameEn, station.nameEn) &&
                Objects.equals(tagline, station.tagline) &&
                Objects.equals(description, station.description) &&
                Objects.equals(streamUrl, station.streamUrl) &&
                Objects.equals(backupStreamUrl, station.backupStreamUrl) &&
                Objects.equals(logoUrl, station.logoUrl) &&
                Objects.equals(thumbnailUrl, station.thumbnailUrl) &&
                Objects.equals(frequency, station.frequency) &&
                Objects.equals(city, station.city) &&
                Objects.equals(country, station.country) &&
                Objects.equals(tags, station.tags);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, name, nameEn, tagline, description, streamUrl, backupStreamUrl,
                logoUrl, thumbnailUrl, frequency, city, country, tags, priority, isLive, isActive,
                isVerified, isFeatured, programsCount, subscribersCount, totalPlays, createdAtMillis, updatedAtMillis);
    }

    @Override
    public String toString() {
        return "Station{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", isLive=" + isLive +
                ", isActive=" + isActive +
                '}';
    }
}
