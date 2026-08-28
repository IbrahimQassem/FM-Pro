package com.sana.dev.fm.data.datasource;

import android.content.Context;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.data.mapper.StationMapper;
import com.sana.dev.fm.domain.model.Station;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Loads seed template stations from assets (seed_yemeni_radios.json).
 */
public final class LocalSeedStationDataSource {

    private static final String SEED_ASSET_FILE = "seed_yemeni_radios.json";

    private LocalSeedStationDataSource() {
    }

    public static List<Station> loadSeedStations(Context context) {
        if (context == null) return Collections.emptyList();
        try (InputStream is = context.getAssets().open(SEED_ASSET_FILE);
             InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8)) {

            Gson gson = new Gson();
            Type listType = new TypeToken<ArrayList<StationDto>>() {}.getType();
            List<StationDto> dtos = gson.fromJson(reader, listType);

            return StationMapper.toDomainList(dtos);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
