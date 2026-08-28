package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

import java.util.Map;

/**
 * Data Transfer Object for Firestore 'episodes' documents.
 */
@IgnoreExtraProperties
public class EpisodeDto {
    @DocumentId
    private String id;
    private String programId;
    private String stationId;
    private String title;
    private String description;
    private String audioUrl;
    private int audioDurationSec;
    private int audioSizeBytes;
    private String coverUrl;
    private String presenter;
    private String guest;
    private boolean isPublished = true;
    private boolean isFeatured = false;
    private Map<String, Long> stats;

    private Timestamp publishedAt;
    private Timestamp broadcastDate;
    @ServerTimestamp
    private Timestamp createdAt;

    public EpisodeDto() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProgramId() { return programId; }
    public void setProgramId(String programId) { this.programId = programId; }

    public String getStationId() { return stationId; }
    public void setStationId(String stationId) { this.stationId = stationId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }

    public int getAudioDurationSec() { return audioDurationSec; }
    public void setAudioDurationSec(int audioDurationSec) { this.audioDurationSec = audioDurationSec; }

    public int getAudioSizeBytes() { return audioSizeBytes; }
    public void setAudioSizeBytes(int audioSizeBytes) { this.audioSizeBytes = audioSizeBytes; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public String getPresenter() { return presenter; }
    public void setPresenter(String presenter) { this.presenter = presenter; }

    public String getGuest() { return guest; }
    public void setGuest(String guest) { this.guest = guest; }

    public boolean isPublished() { return isPublished; }
    public void setPublished(boolean published) { isPublished = published; }

    public boolean isFeatured() { return isFeatured; }
    public void setFeatured(boolean featured) { isFeatured = featured; }

    public Map<String, Long> getStats() { return stats; }
    public void setStats(Map<String, Long> stats) { this.stats = stats; }

    public Timestamp getPublishedAt() { return publishedAt; }
    public void setPublishedAt(Timestamp publishedAt) { this.publishedAt = publishedAt; }

    public Timestamp getBroadcastDate() { return broadcastDate; }
    public void setBroadcastDate(Timestamp broadcastDate) { this.broadcastDate = broadcastDate; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
