package com.sana.dev.fm.model;

import com.sana.dev.fm.R;

public class AppConfig {
//    public static int ivar1, ivar2;
//    public static String svar1, svar2;
//    public static int[] myarray1 = new int[10];


    private int count;
    private String radioName;

    public AppConfig() {
    }

    public AppConfig(int count) {
        this.count = count;
    }

    public AppConfig(String radioName) {
        this.radioName = radioName;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public String getRadioName() {
        return radioName;
    }

    public void setRadioName(String radioName) {
        this.radioName = radioName;
    }

    // Fields from default config.
    public static final boolean DEBUG = false;
    public static final String SITE_URL = "";
    public static final String RADIO_NAME = "هدهد Fm";
    public static final String RADIO_DESC = "تطبيق اليمن الأول الخاص بالفنوات الإذاعية";
    public static final String RADIO_TAG = "hud_hud_fm";
    public static final int RADIO_LOGO = R.mipmap.ic_launcher_round;
    public static final int RADIO_IMG = R.drawable.logo_app; //R.mipmap.ic_radio_launcher_round;
    public static final String RADIO_URL_STREAM = "https://www.bbc.co.uk/sounds/play/live:bbc_radio_five_live";

}
