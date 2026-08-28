package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.datasource.StationsRemoteDataSource;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.domain.model.Station;

import org.junit.Before;
import org.junit.Test;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class StationsRepositoryImplTest {

    private FakeStationsRemoteDataSource fakeRemoteDataSource;
    private StationsRepositoryImpl repository;

    @Before
    public void setUp() {
        fakeRemoteDataSource = new FakeStationsRemoteDataSource();
        repository = new StationsRepositoryImpl(fakeRemoteDataSource, null);
    }

    @Test
    public void getStations_success_mapsAndReturnsStations() {
        StationDto dto = new StationDto();
        dto.setId("st_1");
        dto.setName("راديو صنعاء");
        dto.setFrequency("90.5 FM");
        fakeRemoteDataSource.setStationsResponse(Result.success(Collections.singletonList(dto)));

        final AtomicReference<Result<List<Station>>> resultRef = new AtomicReference<>();
        repository.getStations(false, resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        List<Station> stations = resultRef.get().getDataOrNull();
        assertNotNull(stations);
        assertEquals(1, stations.size());
        assertEquals("st_1", stations.get(0).getId());
        assertEquals("راديو صنعاء", stations.get(0).getName());
    }

    @Test
    public void getStations_cached_doesNotQueryRemoteTwice() {
        StationDto dto = new StationDto();
        dto.setId("st_cache");
        dto.setName("Radio Cache");
        fakeRemoteDataSource.setStationsResponse(Result.success(Collections.singletonList(dto)));

        repository.getStations(false, r -> {});
        assertEquals(1, fakeRemoteDataSource.getCallCount());

        repository.getStations(false, r -> {});
        assertEquals(1, fakeRemoteDataSource.getCallCount()); // Cache hit!
    }

    private static class FakeStationsRemoteDataSource implements StationsRemoteDataSource {
        private Result<List<StationDto>> stationsResponse = Result.success(Collections.emptyList());
        private int callCount = 0;

        public void setStationsResponse(Result<List<StationDto>> response) {
            this.stationsResponse = response;
        }

        public int getCallCount() {
            return callCount;
        }

        @Override
        public void getStations(StationsCallback callback) {
            callCount++;
            if (callback != null) {
                callback.onResult(stationsResponse);
            }
        }

        @Override
        public void getStationById(String stationId, StationCallback callback) {
            if (callback != null) {
                callback.onResult(Result.failure(new AppError.NotFoundError(stationId, "Not found")));
            }
        }

        @Override
        public ListenerRegistration observeStations(StationsCallback callback) {
            return () -> {};
        }
    }
}
