package com.sana.dev.fm.model;


import java.io.Serializable;
import java.util.Date;

public class TrackObject implements Serializable {
    private long id;
    private Date createdDate;
    private long userId;
    private long duration;
    private String sharing;
    private String tagList;
    private String genre;
    private String title;
    private String description;
    private String username;
    private String avatarUrl;
    private String permalinkUrl;
    private String artworkUrl;
    private String waveForm;
    private long playbackCount;
    private long favoriteCount;
    private long commentCount;
    private String linkStream;

    private boolean streamAble;

    public TrackObject(long id, Date createdDate, long userId, long duration, String sharing, String tagList, String genre, String title, String description, String username,
                       String avatarUrl, String permalinkUrl, String artworkUrl, String waveForm, long playbackCount, long favoriteCount, long commentCount, String linkStream) {
        super();
        this.id = id;
        this.createdDate = createdDate;
        this.userId = userId;
        this.duration = duration;
        this.sharing = sharing;
        this.tagList = tagList;
        this.genre = genre;
        this.title = title;
        this.description = description;
        this.username = username;
        this.avatarUrl = avatarUrl;
        this.permalinkUrl = permalinkUrl;
        this.artworkUrl = artworkUrl;
        this.waveForm = waveForm;
        this.playbackCount = playbackCount;
        this.favoriteCount = favoriteCount;
        this.commentCount = commentCount;
        this.linkStream = linkStream;
    }

    public TrackObject() {
        super();
    }

    public long getId() {
        return id;
    }

    public Date getCreatedDate() {
        return createdDate;
    }

    public long getUserId() {
        return userId;
    }

    public long getDuration() {
        return duration;
    }

    public String getSharing() {
        return sharing;
    }

    public String getTagList() {
        return tagList;
    }

    public String getGenre() {
        return genre;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getUsername() {
        return username;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public String getPermalinkUrl() {
        return permalinkUrl;
    }

    public String getArtworkUrl() {
        return artworkUrl;
    }

    public String getWaveForm() {
        return waveForm;
    }

    public long getPlaybackCount() {
        return playbackCount;
    }

    public long getFavoriteCount() {
        return favoriteCount;
    }

    public long getCommentCount() {
        return commentCount;
    }

    public String getLinkStream() {
        return linkStream;
    }

    public boolean isStreamAble() {
        return streamAble;
    }

    public void setStreamAble(boolean streamAble) {
        this.streamAble = streamAble;
    }

    public void setDuration(long duration){
        this.duration = duration;
    }

}
