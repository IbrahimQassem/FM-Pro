package com.sana.dev.fm.core.playback;

import com.sana.dev.fm.model.RadioInfo;

/**
 * Provides a canonical fallback radio station when offline or when no remote data is available.
 */
public final class FallbackStationProvider {

    public static final String DEFAULT_RADIO_ID = "hudhud_fm_main";
    public static final String DEFAULT_NAME = "إذاعة هدهد FM";
    public static final String DEFAULT_FREQ = "92.9 FM";
    public static final String DEFAULT_STREAM_URL = "https://c30.radioboss.fm:18267/stream";
    public static final String DEFAULT_CITY = "صنعاء";

    private FallbackStationProvider() {
        // Utility class
    }

    public static RadioInfo getDefaultStation() {
        RadioInfo radioInfo = new RadioInfo();
        radioInfo.setRadioId(DEFAULT_RADIO_ID);
        radioInfo.setName(DEFAULT_NAME);
        radioInfo.setChannelFreq(DEFAULT_FREQ);
        radioInfo.setStreamUrl(DEFAULT_STREAM_URL);
        radioInfo.setCity(DEFAULT_CITY);
        radioInfo.setDisabled(false);
        radioInfo.setOnline(true);
        radioInfo.setPriority(100);
        return radioInfo;
    }
}
