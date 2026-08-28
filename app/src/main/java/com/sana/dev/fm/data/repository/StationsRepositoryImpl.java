package com.sana.dev.fm.data.repository;

import android.content.Context;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.datasource.LocalSeedStationDataSource;
import com.sana.dev.fm.data.datasource.StationsRemoteDataSource;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.data.mapper.StationMapper;
import com.sana.dev.fm.domain.model.Station;
import com.sana.dev.fm.domain.repository.StationsRepository;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class StationsRepositoryImpl implements StationsRepository {

    private final StationsRemoteDataSource remoteDataSource;
    private final Context appContext;
    private List<Station> inMemoryCache = null;

    public StationsRepositoryImpl(StationsRemoteDataSource remoteDataSource, Context context) {
        this.remoteDataSource = remoteDataSource;
        this.appContext = context != null ? context.getApplicationContext() : null;
    }

    @Override
    public void getStations(boolean forceRefresh, final StationsCallback callback) {
        if (callback == null) return;

        if (!forceRefresh && inMemoryCache != null && !inMemoryCache.isEmpty()) {
            callback.onResult(Result.success(new ArrayList<>(inMemoryCache)));
            return;
        }

        remoteDataSource.getStations(new StationsRemoteDataSource.StationsCallback() {
            @Override
            public void onResult(Result<List<StationDto>> result) {
                if (result.isSuccess()) {
                    List<Station> domainList = StationMapper.toDomainList(result.getDataOrNull());
                    if (domainList.isEmpty() && appContext != null) {
                        // Fallback to seed stations if remote collection is empty
                        domainList = LocalSeedStationDataSource.loadSeedStations(appContext);
                    }
                    domainList = com.sana.dev.fm.domain.ranking.PriorityRankingEngine.sortStations(domainList);
                    inMemoryCache = domainList;
                    callback.onResult(Result.success(domainList));
                } else {
                    // Fallback to seed stations or cache on network error
                    if (inMemoryCache != null && !inMemoryCache.isEmpty()) {
                        callback.onResult(Result.success(new ArrayList<>(inMemoryCache)));
                    } else if (appContext != null) {
                        List<Station> seedList = LocalSeedStationDataSource.loadSeedStations(appContext);
                        if (!seedList.isEmpty()) {
                            seedList = com.sana.dev.fm.domain.ranking.PriorityRankingEngine.sortStations(seedList);
                            inMemoryCache = seedList;
                            callback.onResult(Result.success(seedList));
                        } else {
                            callback.onResult(Result.failure(result.getErrorOrNull()));
                        }
                    } else {
                        callback.onResult(Result.failure(result.getErrorOrNull()));
                    }
                }
            }
        });
    }

    @Override
    public void getStationById(final String stationId, final StationCallback callback) {
        if (callback == null) return;

        // Check cache first
        if (inMemoryCache != null) {
            for (Station s : inMemoryCache) {
                if (s.getId().equals(stationId)) {
                    callback.onResult(Result.success(s));
                    return;
                }
            }
        }

        remoteDataSource.getStationById(stationId, new StationsRemoteDataSource.StationCallback() {
            @Override
            public void onResult(Result<StationDto> result) {
                if (result.isSuccess()) {
                    Station station = StationMapper.toDomain(result.getDataOrNull(), stationId);
                    callback.onResult(Result.success(station));
                } else {
                    callback.onResult(Result.failure(result.getErrorOrNull()));
                }
            }
        });
    }

    @Override
    public ListenerRegistration observeStations(final StationsCallback callback) {
        if (callback == null) {
            return () -> {};
        }

        final StationsRemoteDataSource.ListenerRegistration reg = remoteDataSource.observeStations(new StationsRemoteDataSource.StationsCallback() {
            @Override
            public void onResult(Result<List<StationDto>> result) {
                if (result.isSuccess()) {
                    List<Station> domainList = StationMapper.toDomainList(result.getDataOrNull());
                    if (domainList.isEmpty() && appContext != null) {
                        domainList = LocalSeedStationDataSource.loadSeedStations(appContext);
                    }
                    inMemoryCache = domainList;
                    callback.onResult(Result.success(domainList));
                } else {
                    callback.onResult(Result.failure(result.getErrorOrNull()));
                }
            }
        });

        return new ListenerRegistration() {
            @Override
            public void remove() {
                reg.remove();
            }
        };
    }
}
