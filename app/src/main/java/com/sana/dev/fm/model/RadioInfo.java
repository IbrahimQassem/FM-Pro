package com.sana.dev.fm.model;


import com.google.firebase.firestore.Exclude;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

import java.io.Serializable;

public class RadioInfo implements Serializable {

    private int id;
//    @DocumentId
    private String radioId;
    private String name, desc, streamUrl, logo, tag, city, channelFreq, enName, createBy, createAt;
    private int programsCount, followers, subscribers, rating, priority;
    private boolean isOnline, disabled, isBlueBadge;

    public RadioInfo() {

    }

    public RadioInfo(String radioId, String name, String desc, String streamUrl, String logo, String tag, int programs, int followers, int subscribers, int rating, int priority, boolean isOnline, boolean disabled,  boolean isBlueBadge, String city, String channelFreq, String enName, String createBy, String createAt) {
        this.radioId = radioId;
        this.name = name;
        this.desc = desc;
        this.streamUrl = streamUrl;
        this.logo = logo;
        this.tag = tag;
        this.programsCount = programs;
        this.followers = followers;
        this.subscribers = subscribers;
        this.rating = rating;
        this.priority = priority;
        this.isOnline = isOnline;
        this.disabled = disabled;
        this.isBlueBadge = isBlueBadge;
        this.city = city;
        this.channelFreq = channelFreq;
        this.enName = enName;
        this.createBy = createBy;
        this.createAt = createAt;
    }

    @Exclude
    @Override
    public String toString() {
        return new GsonBuilder().create().toJson(this, RadioInfo.class);
    }

    public String toJSON() {
        Gson gson = new Gson();
        String json = gson.toJson(this);
        return json;
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

//    @Exclude
    public String getRadioId() {
        return radioId;
    }

    public void setRadioId(String radioId) {
        this.radioId = radioId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDesc() {
        return desc;
    }

    public void setDesc(String desc) {
        this.desc = desc;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }

    public String getLogo() {
        return logo;
    }

    public void setLogo(String logo) {
        this.logo = logo;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public int getProgramsCount() {
        return programsCount;
    }

    public void setProgramsCount(int programsCount) {
        this.programsCount = programsCount;
    }

    public int getFollowers() {
        return followers;
    }

    public void setFollowers(int followers) {
        this.followers = followers;
    }

    public int getSubscribers() {
        return subscribers;
    }

    public void setSubscribers(int subscribers) {
        this.subscribers = subscribers;
    }

    public int getRating() {
        return rating;
    }

    public void setRating(int rating) {
        this.rating = rating;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }

    public boolean isOnline() {
        return isOnline;
    }

    public void setOnline(boolean online) {
        isOnline = online;
    }

    public boolean isDisabled() {
        return disabled;
    }

    public void setDisabled(boolean disabled) {
        this.disabled = disabled;
    }

    public boolean isBlueBadge() {
        return isBlueBadge;
    }

    public void setBlueBadge(boolean blueBadge) {
        isBlueBadge = blueBadge;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getChannelFreq() {
        return channelFreq;
    }

    public void setChannelFreq(String channelFreq) {
        this.channelFreq = channelFreq;
    }

    public String getEnName() {
        return enName;
    }

    public void setEnName(String enName) {
        this.enName = enName;
    }

    public String getCreateBy() {
        return createBy;
    }

    public void setCreateBy(String createBy) {
        this.createBy = createBy;
    }

    public String getCreateAt() {
        return createAt;
    }

    public void setCreateAt(String createAt) {
        this.createAt = createAt;
    }
}
