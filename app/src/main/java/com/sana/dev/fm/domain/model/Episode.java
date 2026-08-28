package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Pure canonical domain model for an Episode.
 * Immutable, null-safe, with no Android/Firebase framework dependencies.
 */
public final class Episode implements Serializable {
    private final String id;
    private final String programId;
    private final String stationId;
    private final String title;
    private final String description;
    private final String audioUrl;
    private final int audioDurationSec;
    private final int audioSizeBytes;
    private final String coverUrl;
    private final String presenter;
    private final String guest;
    private final boolean isPublished;
    private final boolean isFeatured;
    private final int playsCount;
    private final int likesCount;
    private final int commentsCount;
    private final int downloadsCount;
    private final long publishedAtMillis;
    private final long broadcastDateMillis;
    private final long createdAtMillis;

    public Episode(String id,
                   String programId,
                   String stationId,
                   String title,
                   String description,
                   String audioUrl,
                   int audioDurationSec,
                   int audioSizeBytes,
                   String coverUrl,
                   String presenter,
                   String guest,
                   boolean isPublished,
                   boolean isFeatured,
                   int playsCount,
                   int likesCount,
                   int commentsCount,
                   int downloadsCount,
                   long publishedAtMillis,
                   long broadcastDateMillis,
                   long createdAtMillis) {
        this.id = id != null ? id : "";
        this.programId = programId != null ? programId : "";
        this.stationId = stationId != null ? stationId : "";
        this.title = title != null ? title : "";
        this.description = description != null ? description : "";
        this.audioUrl = audioUrl != null ? audioUrl : "";
        this.audioDurationSec = Math.max(0, audioDurationSec);
        this.audioSizeBytes = Math.max(0, audioSizeBytes);
        this.coverUrl = coverUrl != null ? coverUrl : "";
        this.presenter = presenter != null ? presenter : "";
        this.guest = guest != null ? guest : "";
        this.isPublished = isPublished;
        this.isFeatured = isFeatured;
        this.playsCount = Math.max(0, playsCount);
        this.likesCount = Math.max(0, likesCount);
        this.commentsCount = Math.max(0, commentsCount);
        this.downloadsCount = Math.max(0, downloadsCount);
        this.publishedAtMillis = Math.max(0, publishedAtMillis);
        this.broadcastDateMillis = Math.max(0, broadcastDateMillis);
        this.createdAtMillis = Math.max(0, createdAtMillis);
    }

    public String getId() { return id; }
    public String getProgramId() { return programId; }
    public String getStationId() { return stationId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getAudioUrl() { return audioUrl; }
    public int getAudioDurationSec() { return audioDurationSec; }
    public int getAudioSizeBytes() { return audioSizeBytes; }
    public String getCoverUrl() { return coverUrl; }
    public String getPresenter() { return presenter; }
    public String getGuest() { return guest; }
    public boolean isPublished() { return isPublished; }
    public boolean isFeatured() { return isFeatured; }
    public int getPlaysCount() { return playsCount; }
    public int getLikesCount() { return likesCount; }
    public int getCommentsCount() { return commentsCount; }
    public int getDownloadsCount() { return downloadsCount; }
    public long getPublishedAtMillis() { return publishedAtMillis; }
    public long getBroadcastDateMillis() { return broadcastDateMillis; }
    public long getCreatedAtMillis() { return createdAtMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Episode episode = (Episode) o;
        return audioDurationSec == episode.audioDurationSec &&
                audioSizeBytes == episode.audioSizeBytes &&
                isPublished == episode.isPublished &&
                isFeatured == episode.isFeatured &&
                playsCount == episode.playsCount &&
                likesCount == episode.likesCount &&
                commentsCount == episode.commentsCount &&
                downloadsCount == episode.downloadsCount &&
                publishedAtMillis == episode.publishedAtMillis &&
                broadcastDateMillis == episode.broadcastDateMillis &&
                createdAtMillis == episode.createdAtMillis &&
                Objects.equals(id, episode.id) &&
                Objects.equals(programId, episode.programId) &&
                Objects.equals(stationId, episode.stationId) &&
                Objects.equals(title, episode.title) &&
                Objects.equals(description, episode.description) &&
                Objects.equals(audioUrl, episode.audioUrl) &&
                Objects.equals(coverUrl, episode.coverUrl) &&
                Objects.equals(presenter, episode.presenter) &&
                Objects.equals(guest, episode.guest);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, programId, stationId, title, description, audioUrl,
                audioDurationSec, audioSizeBytes, coverUrl, presenter, guest, isPublished,
                isFeatured, playsCount, likesCount, commentsCount, downloadsCount,
                publishedAtMillis, broadcastDateMillis, createdAtMillis);
    }

    @Override
    public String toString() {
        return "Episode{" +
                "id='" + id + '\'' +
                ", title='" + title + '\'' +
                ", programId='" + programId + '\'' +
                ", isPublished=" + isPublished +
                '}';
    }
}
