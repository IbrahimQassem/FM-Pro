package com.sana.dev.fm.model;

import androidx.annotation.NonNull;

import java.util.HashMap;
import java.util.Map;

public class Comment extends CommentId {

//    private String userId, post_id, comment, timestamp;
//    private Map<String, Boolean> messageLikes = new HashMap<>();

    private String commentUser;
    private String episodeId;
    private String commentText;
    private String commentUserId;
    private String commentTime;
    private long commentLikesCount;
    private Map<String, Boolean> commentLikes = new HashMap<>();

    public Comment() {
    }

    public Comment(String commentId, String episodeId, String commentUser, String commentText, String commentUserId, String commentTime, long commentLikesCount, Map<String, Boolean> commentLikes) {
        this.commentId = commentId;
        this.episodeId = episodeId;
        this.commentUser = commentUser;
        this.commentText = commentText;
        this.commentUserId = commentUserId;
        this.commentTime = commentTime;
        this.commentLikesCount = commentLikesCount;
        this.commentLikes = commentLikes;
    }

    @Override
    public String toString() {
        return "Comment{" +
                "commentUser='" + commentUser + '\'' +
                ", episodeId='" + episodeId + '\'' +
                ", commentText='" + commentText + '\'' +
                ", commentUserId='" + commentUserId + '\'' +
                ", commentTime='" + commentTime + '\'' +
                ", commentLikesCount=" + commentLikesCount +
                ", commentLikes=" + commentLikes +
                ", commentId='" + commentId + '\'' +
                '}';
    }

    public String getCommentId() {
        return commentId;
    }

    public void setCommentId(String commentId) {
        this.commentId = commentId;
    }

    public String getEpisodeId() {
        return episodeId;
    }

    public void setEpisodeId(String episodeId) {
        this.episodeId = episodeId;
    }

    public String getCommentUser() {
        return commentUser;
    }

    public void setCommentUser(String commentUser) {
        this.commentUser = commentUser;
    }

    public String getCommentText() {
        return commentText;
    }

    public void setCommentText(String commentText) {
        this.commentText = commentText;
    }

    public String getCommentUserId() {
        return commentUserId;
    }

    public void setCommentUserId(String commentUserId) {
        this.commentUserId = commentUserId;
    }

    public String getCommentTime() {
        return commentTime;
    }

    public void setCommentTime(String commentTime) {
        this.commentTime = commentTime;
    }

    public long getCommentLikesCount() {
        return commentLikesCount;
    }

    public void setCommentLikesCount(long commentLikesCount) {
        this.commentLikesCount = commentLikesCount;
    }

    public Map<String, Boolean> getCommentLikes() {
        return commentLikes;
    }

    public void setCommentLikes(Map<String, Boolean> commentLikes) {
        this.commentLikes = commentLikes;
    }
}

class CommentId {

    public String commentId;

    public <T extends CommentId> T withId(@NonNull final String id) {
        this.commentId = id;
        return (T) this;
    }


}