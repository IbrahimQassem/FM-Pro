package com.sana.dev.fm.model;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class AppRemoteConfig {
    private String adminMobile;
    private String developerReference;
    private boolean isAuthSmsEnable;
    private boolean isAuthEmailEnable;
    private boolean isAuthFacebookEnable;
    private boolean isAdMobEnable;

    public AppRemoteConfig() {
    }

    public AppRemoteConfig(String adminMobile, String developerReference, boolean isAuthSmsEnable, boolean isAuthEmailEnable, boolean isAuthFacebookEnable, boolean isAdMobEnable) {
        this.adminMobile = adminMobile;
        this.developerReference = developerReference;
        this.isAuthSmsEnable = isAuthSmsEnable;
        this.isAuthEmailEnable = isAuthEmailEnable;
        this.isAuthFacebookEnable = isAuthFacebookEnable;
        this.isAdMobEnable = isAdMobEnable;
    }

    @Override
    public String toString() {
        return new GsonBuilder().create().toJson(this, AppRemoteConfig.class);
    }

    public String toJSON() {
        Gson gson = new Gson();
        String json = gson.toJson(this);
        return json;
    }

    public String getAdminMobile() {
        return adminMobile;
    }

    public void setAdminMobile(String adminMobile) {
        this.adminMobile = adminMobile;
    }

    public String getDeveloperReference() {
        return developerReference;
    }

    public void setDeveloperReference(String developerReference) {
        this.developerReference = developerReference;
    }

    public boolean isAuthSmsEnable() {
        return isAuthSmsEnable;
    }

    public void setAuthSmsEnable(boolean authSmsEnable) {
        isAuthSmsEnable = authSmsEnable;
    }

    public boolean isAuthEmailEnable() {
        return isAuthEmailEnable;
    }

    public void setAuthEmailEnable(boolean authEmailEnable) {
        isAuthEmailEnable = authEmailEnable;
    }

    public boolean isAuthFacebookEnable() {
        return isAuthFacebookEnable;
    }

    public void setAuthFacebookEnable(boolean authFacebookEnable) {
        isAuthFacebookEnable = authFacebookEnable;
    }

    public boolean isAdMobEnable() {
        return isAdMobEnable;
    }

    public void setAdMobEnable(boolean adMobEnable) {
        isAdMobEnable = adMobEnable;
    }

    //    private int count;
//    private String radioName;
//
//    public AppRemoteConfig() {
//    }
//
//    public AppRemoteConfig(int count) {
//        this.count = count;
//    }
//
//    public AppRemoteConfig(String radioName) {
//        this.radioName = radioName;
//    }
//
//    public int getCount() {
//        return count;
//    }
//
//    public void setCount(int count) {
//        this.count = count;
//    }
//
//    public String getRadioName() {
//        return radioName;
//    }
//
//    public void setRadioName(String radioName) {
//        this.radioName = radioName;
//    }
//
//    // Fields from default config.
//    public static final boolean DEBUG = false;
//    public static final String SITE_URL = "";
//    public static final String RADIO_NAME = "هدهد Fm";
//    public static final String RADIO_DESC = "تطبيق اليمن الأول الخاص بالفنوات الإذاعية";
//    public static final String RADIO_TAG = "hud_hud_fm";
//    public static final int RADIO_LOGO = R.mipmap.ic_launcher_round;
//    public static final int RADIO_IMG = R.drawable.logo_app; //R.mipmap.ic_radio_launcher_round;
//    public static final String RADIO_URL_STREAM = "https://www.bbc.co.uk/sounds/play/live:bbc_radio_five_live";

}
