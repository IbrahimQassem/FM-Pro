package com.sana.dev.fm.model;

public class WakeTranslate {
    String dayKey, dayName;

    public WakeTranslate() {
    }

    public WakeTranslate(String dayKey, String dayName) {
        this.dayKey = dayKey;
        this.dayName = dayName;
    }

    @Override
    public String toString() {
        return "WakeTranslate{" +
                "dayName='" + dayName + '\'' +
                ", dayKey='" + dayKey + '\'' +
                '}';
    }

    public String getDayName() {
        return dayName;
    }

    public void setDayName(String dayName) {
        this.dayName = dayName;
    }

    public String getDayKey() {
        return dayKey;
    }

    public void setDayKey(String dayKey) {
        this.dayKey = dayKey;
    }
}