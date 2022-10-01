package com.sana.dev.fm.model;


import com.google.firebase.firestore.Exclude;

import java.io.Serializable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Episode implements Serializable {

    @Exclude
    public boolean isLiked, isFavorite;
    private int likesCount, favCount;
    //    @Exclude
//    private DateTimeModel showTimeObj;
    private boolean isStopped;
    private String radioId, programId, epId, epName, epDesc, epAnnouncer,
            epProfile, epStreamUrl, programName,
            timestamp, createBy, stopNote;
    private DateTimeModel dateTimeModel;
    private List<DateTimeModel> showTimeList;

    private Map<String, Boolean> episodeLikes = new HashMap<>();

    @Exclude
    private List<Episode> epDayleInfoList;

    @Exclude
    public String userId;
    @Exclude
    public int mExpandedPosition = -2;


//    @ServerTimestamp
//    public Date getTimestamp() { return mTimestamp; }

    public Episode() {
        super();
    }

    public Episode(String timestamp) {
        this.timestamp = timestamp;
    }

    public Episode(Episode another, DateTimeModel showTimeObj) {
        this.radioId = another.radioId;
        this.programId = another.programId;
        this.programName = another.programName;
        this.epId = another.epId;
        this.epName = another.epName;
        this.epDesc = another.epDesc;
        this.epAnnouncer = another.epAnnouncer;
        this.dateTimeModel = another.dateTimeModel;
        this.epProfile = another.epProfile;
        this.epStreamUrl = another.epStreamUrl;
        this.likesCount = another.likesCount;
        this.favCount = another.favCount;
        this.timestamp = another.timestamp;
        this.createBy = another.createBy;
        this.stopNote = another.stopNote;
        this.isStopped = another.isStopped;
//        this.showTimeObj = showTimeObj;

    }

    public Episode(String radioId, String programId, String programName, String epId, String epName, String epDesc, String epAnnouncer, DateTimeModel showDayModel, String epProfile, String epStreamUrl, int likesCount, int favCount, String timestamp, String createBy, String stopNote, boolean isStopped, List<DateTimeModel> dateTimeModel) {
        this.radioId = radioId;
        this.programId = programId;
        this.programName = programName;
        this.epId = epId;
        this.epName = epName;
        this.epDesc = epDesc;
        this.epAnnouncer = epAnnouncer;
        this.dateTimeModel = showDayModel;
        this.epProfile = epProfile;
        this.epStreamUrl = epStreamUrl;
        this.likesCount = likesCount;
        this.favCount = favCount;
        this.timestamp = timestamp;
        this.createBy = createBy;
        this.stopNote = stopNote;
        this.isStopped = isStopped;
        this.showTimeList = dateTimeModel;
    }

    @Override
    public String toString() {
        return "Episode{" +
                "isLiked=" + isLiked +
                ", isFavorite=" + isFavorite +
                ", likesCount=" + likesCount +
                ", favCount=" + favCount +
                ", isStopped=" + isStopped +
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
                ", dateTimeModel=" + dateTimeModel +
                ", showTimeList=" + showTimeList +
                ", episodeLikes=" + episodeLikes +
                ", epDayleInfoList=" + epDayleInfoList +
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

    public boolean isStopped() {
        return isStopped;
    }

    public void setStopped(boolean stopped) {
        isStopped = stopped;
    }

    public Map<String, Boolean> getEpisodeLikes() {
        return episodeLikes;
    }

    public void setEpisodeLikes(Map<String, Boolean> episodeLikes) {
        this.episodeLikes = episodeLikes;
    }

    public DateTimeModel getDateTimeModel() {
        return dateTimeModel;
    }

    public void setDateTimeModel(DateTimeModel dateTimeModel) {
        this.dateTimeModel = dateTimeModel;
    }

    public List<DateTimeModel> getShowTimeList() {
        return showTimeList;
    }

    public void setShowTimeList(List<DateTimeModel> showTimeList) {
        this.showTimeList = showTimeList;
    }

    public List<Episode> getEpDayleInfoList() {
        return epDayleInfoList;
    }

    public void setEpDayleInfoList(List<Episode> epDayleInfoList) {
        this.epDayleInfoList = epDayleInfoList;
    }

//    @ServerTimestamp
//    public Date getmTimestamp() {
//        return mTimestamp;
//    }
//
//    public void setmTimestamp(Date mTimestamp) {
//        this.mTimestamp = mTimestamp;
//    }


}

