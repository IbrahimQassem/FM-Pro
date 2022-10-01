package com.sana.dev.fm.model;

public class TempEpisodeModel {
    private String epProfile,epName,epAnnouncer,displayDayName;
    private DateTimeModel dateTimeModel;

    public TempEpisodeModel(String epProfile, String epName, String epAnnouncer, String displayDayName, DateTimeModel dateTimeModel) {
        this.epProfile = epProfile;
        this.epName = epName;
        this.epAnnouncer = epAnnouncer;
        this.displayDayName = displayDayName;
        this.dateTimeModel = dateTimeModel;
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

    public DateTimeModel getDateTimeModel() {
        return dateTimeModel;
    }

    public void setDateTimeModel(DateTimeModel dateTimeModel) {
        this.dateTimeModel = dateTimeModel;
    }

    public String getDisplayDayName() {
        return displayDayName;
    }

    public void setDisplayDayName(String displayDayName) {
        this.displayDayName = displayDayName;
    }
}
