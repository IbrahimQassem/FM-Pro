package com.sana.dev.fm.core.playback;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.sana.dev.fm.model.RadioInfo;

import java.util.List;

/**
 * Pure policy for resolving the active radio station for 2-click playback:
 * 1. Previously selected / favorite station
 * 2. First active station in available station list
 * 3. Canonical fallback station
 */
public final class DefaultStationPolicy {

    private DefaultStationPolicy() {
        // Utility class
    }

    @NonNull
    public static RadioInfo resolveActiveStation(
            @Nullable RadioInfo selectedRadio,
            @Nullable List<RadioInfo> availableStations
    ) {
        if (selectedRadio != null && isValidStation(selectedRadio)) {
            return selectedRadio;
        }

        if (availableStations != null) {
            for (RadioInfo station : availableStations) {
                if (station != null && isValidStation(station)) {
                    return station;
                }
            }
        }

        return FallbackStationProvider.getDefaultStation();
    }

    private static boolean isValidStation(@NonNull RadioInfo station) {
        return station.getStreamUrl() != null &&
                !station.getStreamUrl().trim().isEmpty() &&
                !station.isDisabled();
    }
}
