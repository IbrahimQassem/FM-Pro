package com.sana.dev.fm.model;



import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;

public class NotificationModel implements Serializable {

    @SerializedName("title")
    @Expose
    private String title;

    @SerializedName("body")
    @Expose
    private String body;

    @SerializedName("datetime")
    @Expose
    private String datetime;

    @SerializedName("image")
    @Expose
    private String image;

    @SerializedName("siteUrl")
    @Expose
    private String siteUrl;

    @SerializedName("isViewed")
    @Expose
    private boolean isViewed;

    public boolean isViewed() {
        return isViewed;
    }

    public void setRead(boolean read) {
        isViewed = read;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getBody() {
        return body;
    }

    public void setBody(String body) {
        this.body = body;
    }

    public String getDatetime() {
        return datetime;
    }

    public void setDatetime(String datetime) {
        this.datetime = datetime;
    }

    public String getImage() {
        return image;
    }

    public void setImage(String image) {
        this.image = image;
    }

    public String getSiteUrl() {
        return siteUrl;
    }

    public void setSiteUrl(String siteUrl) {
        this.siteUrl = siteUrl;
    }
}