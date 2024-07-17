package com.sana.dev.fm.model;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;

public class AppRemoteConfig {
    private String adminMobile;
    private String developerReference;
    private String termsReference;
    private boolean isAuthSmsEnable;
    private boolean isAuthGoogleEnable;
    private boolean isAuthEmailEnable;
    private boolean isAuthFacebookEnable;
    private boolean isAdMobEnable;
    private boolean isTrialMode;
    private int requiredVersion;

    public AppRemoteConfig() {
    }

    public AppRemoteConfig(String adminMobile, String developerReference, String termsReference, boolean isAuthSmsEnable, boolean isAuthGoogleEnable, boolean isAuthEmailEnable, boolean isAuthFacebookEnable, boolean isAdMobEnable, boolean isTrialMode,int requiredVersion) {
        this.adminMobile = adminMobile;
        this.developerReference = developerReference;
        this.termsReference = termsReference;
        this.isAuthSmsEnable = isAuthSmsEnable;
        this.isAuthGoogleEnable = isAuthGoogleEnable;
        this.isAuthEmailEnable = isAuthEmailEnable;
        this.isAuthFacebookEnable = isAuthFacebookEnable;
        this.isAdMobEnable = isAdMobEnable;
        this.isTrialMode = isTrialMode;
        this.requiredVersion = requiredVersion;
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

    public String getTermsReference() {
        return termsReference;
    }

    public void setTermsReference(String termsReference) {
        this.termsReference = termsReference;
    }

    public boolean isAuthSmsEnable() {
        return isAuthSmsEnable;
    }

    public void setAuthSmsEnable(boolean authSmsEnable) {
        isAuthSmsEnable = authSmsEnable;
    }

    public boolean isAuthGoogleEnable() {
        return isAuthGoogleEnable;
    }

    public void setAuthGoogleEnable(boolean authGoogleEnable) {
        isAuthGoogleEnable = authGoogleEnable;
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

    public boolean isTrialMode() {
        return isTrialMode;
    }

    public void setTrialMode(boolean trialMode) {
        isTrialMode = trialMode;
    }

    public int getRequiredVersion() {
        return requiredVersion;
    }

    public void setRequiredVersion(int requiredVersion) {
        this.requiredVersion = requiredVersion;
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
