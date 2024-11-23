package com.sana.dev.fm.model;

import java.util.ArrayList;
import java.util.List;

public class Comment {
    private String id;
    private String episodeId;
    private String userId;
    private String userName;
    private String userPhotoUrl;
    private String content;
    private long timestamp;
    private int reportCount;
    private boolean isReviewed;
    private List<String> reportedBy;
    private List<String> likedBy;

    public Comment() {
        // Required empty constructor for Firestore
    }

    public Comment(String userId, String episodeId, String userName, String userPhotoUrl, String content) {
        this.userId = userId;
        this.episodeId = episodeId;
        this.userName = userName;
        this.userPhotoUrl = userPhotoUrl;
        this.content = content;
        this.timestamp = System.currentTimeMillis();
        this.reportCount = 0;
        this.isReviewed = false;
        this.reportedBy = new ArrayList<>();
        this.likedBy = new ArrayList<>();
    }

    // Getters and setters
    // ... (implement all getters and setters)

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEpisodeId() {
        return episodeId;
    }

    public void setEpisodeId(String episodeId) {
        this.episodeId = episodeId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserPhotoUrl() {
        return userPhotoUrl;
    }

    public void setUserPhotoUrl(String userPhotoUrl) {
        this.userPhotoUrl = userPhotoUrl;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    public int getReportCount() {
        return reportCount;
    }

    public void setReportCount(int reportCount) {
        this.reportCount = reportCount;
    }

    public boolean isReviewed() {
        return isReviewed;
    }

    public void setReviewed(boolean reviewed) {
        isReviewed = reviewed;
    }

    public List<String> getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(List<String> reportedBy) {
        this.reportedBy = reportedBy;
    }

    public List<String> getLikedBy() {
        return likedBy;
    }

    public void setLikedBy(List<String> likedBy) {
        this.likedBy = likedBy;
    }
}