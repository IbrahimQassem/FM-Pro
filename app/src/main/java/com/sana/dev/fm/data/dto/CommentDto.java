package com.sana.dev.fm.data.dto;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentId;
import com.google.firebase.firestore.IgnoreExtraProperties;
import com.google.firebase.firestore.ServerTimestamp;

import java.util.Map;

/**
 * Data Transfer Object for Firestore 'comments' documents inside episodes subcollection.
 */
@IgnoreExtraProperties
public class CommentDto {
    @DocumentId
    private String id;
    private String episodeId;
    private Map<String, Object> author;
    private String content;
    private int likesCount = 0;
    private boolean isEdited = false;
    private String status = "visible";

    @ServerTimestamp
    private Timestamp createdAt;
    @ServerTimestamp
    private Timestamp updatedAt;

    public CommentDto() {
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEpisodeId() { return episodeId; }
    public void setEpisodeId(String episodeId) { this.episodeId = episodeId; }

    public Map<String, Object> getAuthor() { return author; }
    public void setAuthor(Map<String, Object> author) { this.author = author; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public int getLikesCount() { return likesCount; }
    public void setLikesCount(int likesCount) { this.likesCount = likesCount; }

    public boolean isEdited() { return isEdited; }
    public void setEdited(boolean edited) { isEdited = edited; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public Timestamp getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Timestamp updatedAt) { this.updatedAt = updatedAt; }
}
