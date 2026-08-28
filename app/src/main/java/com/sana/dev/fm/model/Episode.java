package com.sana.dev.fm.model;


import com.google.firebase.firestore.Exclude;
import com.google.firebase.firestore.IgnoreExtraProperties;

import java.io.Serializable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@IgnoreExtraProperties
public class Episode implements Serializable {
    @Exclude
    public boolean isLiked, isFavorite;
    private int likesCount, favCount;
    private boolean disabled;
    private String radioId, programId, epId, epName, epDesc, epAnnouncer,
            epProfile, epStreamUrl, programName,
            timestamp, createBy, stopNote;
    private DateTimeModel programScheduleTime;
    private List<DateTimeModel> showTimeList;
    private Map<String, Boolean> episodeLikes = new HashMap<>();
    @Exclude
    public String userId;
    @Exclude
    public int mExpandedPosition = -2;

//    @ServerTimestamp
//    public Date getTimestamp() { return mTimestamp; }
    public boolean isLikedByAnyUser(List<String> userIds) {
        if (episodeLikes == null || userIds == null) return false;

        for (String userId : userIds) {
            if (Boolean.TRUE.equals(episodeLikes.get(userId))) {
                return true;
            }
        }
        return false;
    }

    public boolean isLikedBy(String userId) {
        return episodeLikes != null && userId != null && Boolean.TRUE.equals(episodeLikes.get(userId));
    }

    public int getTotalLikes() {
        return episodeLikes != null ? episodeLikes.size() : 0;
    }


    public Episode() {
        super();
    }

    public Episode(String timestamp) {
        this.timestamp = timestamp;
    }


    public Episode(String radioId, String programId, String programName, String epId, String epName, String epDesc, String epAnnouncer, DateTimeModel programScheduleTime, String epProfile, String epStreamUrl, int likesCount, int favCount, String timestamp, String createBy, String stopNote, boolean disabled, List<DateTimeModel> dateTimeModel) {
        this.radioId = radioId;
        this.programId = programId;
        this.programName = programName;
        this.epId = epId;
        this.epName = epName;
        this.epDesc = epDesc;
        this.epAnnouncer = epAnnouncer;
        this.programScheduleTime = programScheduleTime;
        this.epProfile = epProfile;
        this.epStreamUrl = epStreamUrl;
        this.likesCount = likesCount;
        this.favCount = favCount;
        this.timestamp = timestamp;
        this.createBy = createBy;
        this.stopNote = stopNote;
        this.disabled = disabled;
        this.showTimeList = dateTimeModel;
    }

    @Override
    public String toString() {
        return "Episode{" +
                "isLiked=" + isLiked +
                ", isFavorite=" + isFavorite +
                ", likesCount=" + likesCount +
                ", favCount=" + favCount +
                ", disabled=" + disabled +
                ", radioId='" + radioId + '\'' +
                ", programId='" + programId + '\'' +
                ", epId='" + epId + '\'' +
                ", epName='" + epName + '\'' +
                ", epDesc='" + epDesc + '\'' +
                ", epAnnouncer='" + epAnnouncer + '\'' +
                ", epProfile='" + epProfile + '\'' +
                ", epStreamUrl='" + epStreamUrl + '\'' +
                ", programName='" + programName + '\'' +
                ", timestamp='" + timestamp + '\'' +
                ", createBy='" + createBy + '\'' +
                ", stopNote='" + stopNote + '\'' +
                ", programScheduleTime=" + programScheduleTime +
                ", showTimeList=" + showTimeList +
                ", episodeLikes=" + episodeLikes +
                ", userId='" + userId + '\'' +
                '}';
    }

    public String getRadioId() {
        return radioId;
    }

    public void setRadioId(String radioId) {
        this.radioId = radioId;
    }

    public String getProgramId() {
        return programId;
    }

    public void setProgramId(String programId) {
        this.programId = programId;
    }

    public String getEpId() {
        return epId;
    }

    public void setEpId(String epId) {
        this.epId = epId;
    }

    public String getEpName() {
        return epName;
    }

    public void setEpName(String epName) {
        this.epName = epName;
    }

    public String getEpDesc() {
        return epDesc;
    }

    public void setEpDesc(String epDesc) {
        this.epDesc = epDesc;
    }

    public String getEpAnnouncer() {
        return epAnnouncer;
    }

    public void setEpAnnouncer(String epAnnouncer) {
        this.epAnnouncer = epAnnouncer;
    }

    public String getEpProfile() {
        return epProfile;
    }

    public void setEpProfile(String epProfile) {
        this.epProfile = epProfile;
    }


    public String getProgramName() {
        return programName;
    }

    public void setProgramName(String programName) {
        this.programName = programName;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(int likesCount) {
        this.likesCount = likesCount;
    }

    public int getFavCount() {
        return favCount;
    }

    public void setFavCount(int favCount) {
        this.favCount = favCount;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public String getEpStreamUrl() {
        return epStreamUrl;
    }

    public void setEpStreamUrl(String epStreamUrl) {
        this.epStreamUrl = epStreamUrl;
    }

    public String getCreateBy() {
        return createBy;
    }

    public void setCreateBy(String createBy) {
        this.createBy = createBy;
    }

    public String getStopNote() {
        return stopNote;
    }

    public void setStopNote(String stopNote) {
        this.stopNote = stopNote;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }

    public Map<String, Boolean> getEpisodeLikes() {
        return episodeLikes;
    }

    public void setEpisodeLikes(Map<String, Boolean> episodeLikes) {
        this.episodeLikes = episodeLikes;
    }

    public DateTimeModel getProgramScheduleTime() {
        return programScheduleTime;
    }

    public void setProgramScheduleTime(DateTimeModel programScheduleTime) {
        this.programScheduleTime = programScheduleTime;
    }

    public List<DateTimeModel> getShowTimeList() {
        return showTimeList;
    }

    public void setShowTimeList(List<DateTimeModel> showTimeList) {
        this.showTimeList = showTimeList;
    }

    // Canonical schema aliases
    public void setTitle(String title) {
        if (title != null) this.epName = title;
    }

    public void setName(String name) {
        if (name != null) this.epName = name;
    }

    public void setDescription(String desc) {
        if (desc != null) this.epDesc = desc;
    }

    public void setCoverUrl(String coverUrl) {
        if (coverUrl != null) this.epProfile = coverUrl;
    }

    public void setImageUrl(String imageUrl) {
        if (imageUrl != null) this.epProfile = imageUrl;
    }

    public void setAudioUrl(String audioUrl) {
        if (audioUrl != null) this.epStreamUrl = audioUrl;
    }

    public void setStreamUrl(String streamUrl) {
        if (streamUrl != null) this.epStreamUrl = streamUrl;
    }

    public void setStationId(String stationId) {
        if (stationId != null) this.radioId = stationId;
    }

    public void setStationName(String stationName) {
        // Can be used for display
    }

    public void setProgramTitle(String programTitle) {
        if (programTitle != null) this.programName = programTitle;
    }

    public void setPresenters(Object presenters) {
        if (presenters instanceof String) {
            this.epAnnouncer = (String) presenters;
        } else if (presenters instanceof List && !((List<?>) presenters).isEmpty()) {
            Object first = ((List<?>) presenters).get(0);
            if (first != null) this.epAnnouncer = first.toString();
        }
    }

    public void setStats(Map<String, Object> stats) {
        if (stats != null) {
            Object likes = stats.get("likesCount");
            if (likes instanceof Number) this.likesCount = ((Number) likes).intValue();
            Object favs = stats.get("favCount");
            if (favs instanceof Number) this.favCount = ((Number) favs).intValue();
        }
    }

    public void setId(String id) {
        if (id != null) this.epId = id;
    }

    public void setIsActive(boolean active) {
        this.disabled = !active;
    }

    public void setPresenter(String presenter) {
        if (presenter != null) this.epAnnouncer = presenter;
    }

    public void setAnnouncer(String announcer) {
        if (announcer != null) this.epAnnouncer = announcer;
    }

    public void setBanner(String banner) {
        if (banner != null) this.epProfile = banner;
    }

    public void setPhoto(String photo) {
        if (photo != null) this.epProfile = photo;
    }

    public void setLogo(String logo) {
        if (logo != null) this.epProfile = logo;
    }
}

