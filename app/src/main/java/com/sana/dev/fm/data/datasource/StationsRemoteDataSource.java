package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.dto.StationDto;

import java.util.List;

public interface StationsRemoteDataSource {

    interface StationsCallback {
        void onResult(Result<List<StationDto>> result);
    }

    interface StationCallback {
        void onResult(Result<StationDto> result);
    }

    interface ListenerRegistration {
        void remove();
    }

    void getStations(StationsCallback callback);

    void getStationById(String stationId, StationCallback callback);

    ListenerRegistration observeStations(StationsCallback callback);
}
