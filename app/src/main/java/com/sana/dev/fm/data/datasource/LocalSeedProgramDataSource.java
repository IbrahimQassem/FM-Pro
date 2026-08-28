package com.sana.dev.fm.data.datasource;

import android.content.Context;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.sana.dev.fm.data.mapper.ProgramMapper;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.model.RadioProgram;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Loads seed template programs from assets (seed_programs.json).
 * Provides offline-first and empty-database resilience.
 */
public final class LocalSeedProgramDataSource {

    private static final String SEED_ASSET_FILE = "seed_programs.json";

    private LocalSeedProgramDataSource() {
    }

    public static List<Program> loadSeedPrograms(Context context, String stationId) {
        if (context == null) return Collections.emptyList();
        try (InputStream is = context.getAssets().open(SEED_ASSET_FILE);
             InputStreamReader reader = new InputStreamReader(is, StandardCharsets.UTF_8)) {

            Gson gson = new Gson();
            Type listType = new TypeToken<ArrayList<RadioProgram>>() {}.getType();
            List<RadioProgram> dtos = gson.fromJson(reader, listType);
            if (dtos == null) return Collections.emptyList();

            List<Program> all = new ArrayList<>();
            for (RadioProgram dto : dtos) {
                if (dto != null) {
                    all.add(ProgramMapper.toDomain(dto));
                }
            }

            if (stationId == null || stationId.trim().isEmpty()) {
                return all;
            }

            List<Program> filtered = new ArrayList<>();
            for (Program p : all) {
                if (stationId.equalsIgnoreCase(p.getRadioId())) {
                    filtered.add(p);
                }
            }

            return filtered.isEmpty() ? all : filtered;
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }
}
