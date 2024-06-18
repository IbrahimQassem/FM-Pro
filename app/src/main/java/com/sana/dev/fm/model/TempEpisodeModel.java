package com.sana.dev.fm.model;

public class TempEpisodeModel {
    private String epProfile,epName,epAnnouncer,displayDayName;
    private DateTimeModel programScheduleTime;

    public TempEpisodeModel(String epProfile, String epName, String epAnnouncer, String displayDayName, DateTimeModel programScheduleTime) {
        this.epProfile = epProfile;
        this.epName = epName;
        this.epAnnouncer = epAnnouncer;
        this.displayDayName = displayDayName;
        this.programScheduleTime = programScheduleTime;
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

    public DateTimeModel getProgramScheduleTime() {
        return programScheduleTime;
    }

    public void setProgramScheduleTime(DateTimeModel programScheduleTime) {
        this.programScheduleTime = programScheduleTime;
    }

    public String getDisplayDayName() {
        return displayDayName;
    }

    public void setDisplayDayName(String displayDayName) {
        this.displayDayName = displayDayName;
    }
}
