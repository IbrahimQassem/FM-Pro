package com.sana.dev.fm.model;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class TempEpModel {
    private String name, desc, tag, category, imgProfile;
    private int likesCount, subScribeCount, postCount;

    public TempEpModel() {
    }

    public TempEpModel(String name, String desc, String tag, String category, String imgProfile, int likesCount, int subScribeCount, int postCount) {
        this.name = name;
        this.desc = desc;
        this.tag = tag;
        this.category = category;
        this.imgProfile = imgProfile;
        this.likesCount = likesCount;
        this.subScribeCount = subScribeCount;
        this.postCount = postCount;
    }

    @Override
    public String toString() {
        return new GsonBuilder().create().toJson(this, TempEpModel.class);
    }

    public String toJSON() {
        Gson gson = new Gson();
        String json = gson.toJson(this);
        return json;
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

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getImgProfile() {
        return imgProfile;
    }

    public void setImgProfile(String imgProfile) {
        this.imgProfile = imgProfile;
    }

    public int getLikesCount() {
        return likesCount;
    }

    public void setLikesCount(int likesCount) {
        this.likesCount = likesCount;
    }

    public int getSubScribeCount() {
        return subScribeCount;
    }

    public void setSubScribeCount(int subScribeCount) {
        this.subScribeCount = subScribeCount;
    }

    public int getPostCount() {
        return postCount;
    }

    public void setPostCount(int postCount) {
        this.postCount = postCount;
    }
}
