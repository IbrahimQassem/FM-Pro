package com.sana.dev.fm.domain.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Pure canonical domain model for a Comment.
 * Immutable, null-safe, with no Android/Firebase framework dependencies.
 */
public final class Comment implements Serializable {
    private final String id;
    private final String episodeId;
    private final String authorUid;
    private final String authorName;
    private final String authorAvatarUrl;
    private final boolean isAuthorVerified;
    private final String content;
    private final int likesCount;
    private final boolean isEdited;
    private final String status;
    private final long createdAtMillis;
    private final long updatedAtMillis;

    public Comment(String id,
                   String episodeId,
                   String authorUid,
                   String authorName,
                   String authorAvatarUrl,
                   boolean isAuthorVerified,
                   String content,
                   int likesCount,
                   boolean isEdited,
                   String status,
                   long createdAtMillis,
                   long updatedAtMillis) {
        this.id = id != null ? id : "";
        this.episodeId = episodeId != null ? episodeId : "";
        this.authorUid = authorUid != null ? authorUid : "";
        this.authorName = authorName != null ? authorName : "";
        this.authorAvatarUrl = authorAvatarUrl != null ? authorAvatarUrl : "";
        this.isAuthorVerified = isAuthorVerified;
        this.content = content != null ? content : "";
        this.likesCount = Math.max(0, likesCount);
        this.isEdited = isEdited;
        this.status = status != null ? status : "visible";
        this.createdAtMillis = Math.max(0, createdAtMillis);
        this.updatedAtMillis = Math.max(0, updatedAtMillis);
    }

    public String getId() { return id; }
    public String getEpisodeId() { return episodeId; }
    public String getAuthorUid() { return authorUid; }
    public String getAuthorName() { return authorName; }
    public String getAuthorAvatarUrl() { return authorAvatarUrl; }
    public boolean isAuthorVerified() { return isAuthorVerified; }
    public String getContent() { return content; }
    public int getLikesCount() { return likesCount; }
    public boolean isEdited() { return isEdited; }
    public String getStatus() { return status; }
    public long getCreatedAtMillis() { return createdAtMillis; }
    public long getUpdatedAtMillis() { return updatedAtMillis; }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Comment comment = (Comment) o;
        return isAuthorVerified == comment.isAuthorVerified &&
                likesCount == comment.likesCount &&
                isEdited == comment.isEdited &&
                createdAtMillis == comment.createdAtMillis &&
                updatedAtMillis == comment.updatedAtMillis &&
                Objects.equals(id, comment.id) &&
                Objects.equals(episodeId, comment.episodeId) &&
                Objects.equals(authorUid, comment.authorUid) &&
                Objects.equals(authorName, comment.authorName) &&
                Objects.equals(authorAvatarUrl, comment.authorAvatarUrl) &&
                Objects.equals(content, comment.content) &&
                Objects.equals(status, comment.status);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, episodeId, authorUid, authorName, authorAvatarUrl,
                isAuthorVerified, content, likesCount, isEdited, status, createdAtMillis, updatedAtMillis);
    }

    @Override
    public String toString() {
        return "Comment{" +
                "id='" + id + '\'' +
                ", episodeId='" + episodeId + '\'' +
                ", authorName='" + authorName + '\'' +
                '}';
    }
}
