package com.sana.dev.fm.domain.repository;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.domain.model.Station;

import java.util.List;

public interface StationsRepository {

    interface StationsCallback {
        void onResult(Result<List<Station>> result);
    }

    interface StationCallback {
        void onResult(Result<Station> result);
    }

    interface ListenerRegistration {
        void remove();
    }

    void getStations(boolean forceRefresh, StationsCallback callback);

    void getStationById(String stationId, StationCallback callback);

    ListenerRegistration observeStations(StationsCallback callback);
}
