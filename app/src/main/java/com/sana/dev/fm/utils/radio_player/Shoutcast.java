package com.sana.dev.fm.utils.radio_player;

import com.google.gson.annotations.SerializedName;

public class Shoutcast {

    private String name;

    @SerializedName("stream")
    private String url;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUrl() {
        return url;
    }

    public void setUrl(String url) {
        this.url = url;
    }
}
