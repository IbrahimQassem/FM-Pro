package com.sana.dev.fm.model;


import com.google.firebase.firestore.Exclude;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class RadioProgram implements Serializable {


    List<String> prCategoryList;
    private int episodeCount, likesCount, subscribeCount, rateCount = 0;
    private boolean disabled = false;
    //    private Long id;
    private String programId, radioId, prName, prDesc, prTag, prProfile, timestamp, createBy, stopNote;
    private DateTimeModel programScheduleTime;

    @Exclude
    public boolean isLiked, isSubscribe;
    @Exclude
    public boolean isSwiped = false;
    @Exclude
    public Map<String, Boolean> stars = new HashMap<>();
    @Exclude
    List<RadioProgram> programList = new ArrayList<>();

//    @Exclude
//    private boolean isExpanded = false;

//    public boolean isExpanded() {
//        return isExpanded;
//    }
//
//    public void setExpanded(boolean expanded) {
//        isExpanded = expanded;
//    }

    public RadioProgram() {
    }

    public RadioProgram(String programId, String radioId, String prName, String prDesc, List<String> prCategoryList, String prTag, String prProfile, int likesCount, int subscribeCount, int rateCount, String timestamp, String createBy, boolean disabled, String stopNote, DateTimeModel programScheduleTime) {
        this.programId = programId;
        this.radioId = radioId;
        this.prName = prName;
        this.prDesc = prDesc;
        this.prCategoryList = prCategoryList;
        this.prTag = prTag;
        this.prProfile = prProfile;
        this.likesCount = likesCount;
        this.subscribeCount = subscribeCount;
        this.rateCount = rateCount;
        this.timestamp = timestamp;
        this.createBy = createBy;
        this.disabled = disabled;
        this.stopNote = stopNote;
        this.programScheduleTime = programScheduleTime;
    }


    //    @Exclude
//    public Map<String, Object> toMap() {
//        HashMap<String, Object> result = new HashMap<>();
//        result.put("radioId", radioId);
//        result.put("pId", pId);
//        result.put("pName", pName);
//        result.put("pDesc", pDesc);
//        result.put("pCategory", pCategory);
//        result.put("pTag", pTag);
//        result.put("pProfile", pProfile);
//        return result;
//    }

    /**
     * Pay attention here, you have to override the toString method as the
     * ArrayAdapter will reads the toString of the given object for the name
     *
     * @return contact_name
     */
    @Override
    public String toString() {
        return prName;
    }

    public static RadioProgram findRadioProgram(String programId, List<RadioProgram> programList) {
        // Goes through the List .
        for (RadioProgram i : programList) {
            if (i.getRadioId().equals(programId)) {
                return i;
            }
        }
        return null;
    }


    public String getProgramId() {
        return programId;
    }

    public void setProgramId(String programId) {
        this.programId = programId;
    }

    public String getRadioId() {
        return radioId;
    }

    public void setRadioId(String radioId) {
        this.radioId = radioId;
    }

    public String getPrName() {
        return prName;
    }

    public void setPrName(String prName) {
        this.prName = prName;
    }

    public String getPrDesc() {
        return prDesc;
    }

    public void setPrDesc(String prDesc) {
        this.prDesc = prDesc;
    }

    public List<String> getPrCategoryList() {
        return prCategoryList;
    }

    public void setPrCategoryList(List<String> prCategoryList) {
        this.prCategoryList = prCategoryList;
    }

    public String getPrTag() {
        return prTag;
    }

    public void setPrTag(String prTag) {
        this.prTag = prTag;
    }

    public String getPrProfile() {
        return prProfile;
    }

    public void setPrProfile(String prProfile) {
        this.prProfile = prProfile;
    }


    public int getEpisodeCount() {
        return episodeCount;
    }

    public void setEpisodeCount(int episodeCount) {
        this.episodeCount = episodeCount;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(int likesCount) {
        this.likesCount = likesCount;
    }

    public int getSubscribeCount() {
        return subscribeCount;
    }

    public void setSubscribeCount(int subscribeCount) {
        this.subscribeCount = subscribeCount;
    }

    public int getRateCount() {
        return rateCount;
    }

    public void setRateCount(int rateCount) {
        this.rateCount = rateCount;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
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

    public DateTimeModel getProgramScheduleTime() {
        return programScheduleTime;
    }

    public void setProgramScheduleTime(DateTimeModel programScheduleTime) {
        this.programScheduleTime = programScheduleTime;
    }
}
