package com.sana.dev.fm.data.datasource;

import android.content.Context;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sana.dev.fm.model.Episode;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Loads seed template episodes from assets (seed_episodes.json).
 * Provides offline-first and empty-database resilience for Feed and Episode screens.
 */
public final class LocalSeedEpisodeDataSource {

    private static final String SEED_ASSET_FILE = "seed_episodes.json";

    private LocalSeedEpisodeDataSource() {
    }

    public static List<Episode> loadSeedEpisodes(Context context, String stationId) {
        if (context == null) return Collections.emptyList();
        try (InputStream is = context.getAssets().open(SEED_ASSET_FILE);
             InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8)) {

            Gson gson = new Gson();
            Type listType = new TypeToken<ArrayList<Episode>>() {}.getType();
            List<Episode> all = gson.fromJson(reader, listType);
            if (all == null) return Collections.emptyList();

            if (stationId == null || stationId.trim().isEmpty()) {
                return all;
            }

            List<Episode> filtered = new ArrayList<>();
            for (Episode ep : all) {
                if (stationId.equalsIgnoreCase(ep.getRadioId())) {
                    filtered.add(ep);
                }
            }

            // Return filtered or all as resilient fallback
            return filtered.isEmpty() ? all : filtered;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
