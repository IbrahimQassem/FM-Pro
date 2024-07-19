package com.sana.dev.fm.model;

import com.sana.dev.fm.model.enums.Weekday;

import java.util.List;

public class TempEpisodeModel {
    private String epProfile,epName,epAnnouncer;
    private DateTimeModel showTime;
    private Weekday displayDay;

    public TempEpisodeModel(String epProfile, String epName, String epAnnouncer, DateTimeModel showTime, Weekday displayDay) {
        this.epProfile = epProfile;
        this.epName = epName;
        this.epAnnouncer = epAnnouncer;
        this.showTime = showTime;
        this.displayDay = displayDay;
    }

    public String getEpProfile() {
        return epProfile;
    }

    public void setEpProfile(String epProfile) {
        this.epProfile = epProfile;
    }

    public String getEpName() {
        return epName;
    }

    public void setEpName(String epName) {
        this.epName = epName;
    }

    public String getEpAnnouncer() {
        return epAnnouncer;
    }

    public void setEpAnnouncer(String epAnnouncer) {
        this.epAnnouncer = epAnnouncer;
    }

    public DateTimeModel getShowTime() {
        return showTime;
    }

    public void setShowTime(DateTimeModel showTime) {
        this.showTime = showTime;
    }

    public Weekday getDisplayDay() {
        return displayDay;
    }

    public void setDisplayDay(Weekday displayDay) {
        this.displayDay = displayDay;
    }
}
