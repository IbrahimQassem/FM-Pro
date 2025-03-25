package com.sana.dev.fm.utils.my_firebase;

import android.content.Context;
import android.os.Bundle;

import com.google.firebase.analytics.FirebaseAnalytics;

public class RadioAnalytics {

    private FirebaseAnalytics firebaseAnalytics;

    public RadioAnalytics(Context context) {
        firebaseAnalytics = FirebaseAnalytics.getInstance(context);
    }

    // Log when a user selects a station
    public void logSelectStation(String stationName, String genre, int listenerCount) {
        Bundle bundle = new Bundle();
        bundle.putString("station_name", stationName);
        bundle.putString("genre", genre);
        bundle.putInt("listener_count", listenerCount);
        firebaseAnalytics.logEvent("select_station", bundle);
    }

    // Log when a user starts playback
    public void logPlayStation(String stationName, long playbackDuration) {
        Bundle bundle = new Bundle();
        bundle.putString("station_name", stationName);
        bundle.putLong("playback_duration", playbackDuration);
        firebaseAnalytics.logEvent("play_station", bundle);
    }

    // Log when a user pauses playback
    public void logPauseStation(String stationName, long playbackDuration) {
        Bundle bundle = new Bundle();
        bundle.putString("station_name", stationName);
        bundle.putLong("playback_duration", playbackDuration);
        firebaseAnalytics.logEvent("pause_station", bundle);
    }

    // Log when a user skips to the next station
    public void logSkipStation(String currentStation, String nextStation) {
        Bundle bundle = new Bundle();
        bundle.putString("current_station", currentStation);
        bundle.putString("next_station", nextStation);
        firebaseAnalytics.logEvent("skip_station", bundle);
    }
}