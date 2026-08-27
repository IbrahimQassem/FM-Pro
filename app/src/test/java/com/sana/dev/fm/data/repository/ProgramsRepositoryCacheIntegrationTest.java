package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.core.time.FakeClock;
import com.sana.dev.fm.data.datasource.FakeProgramsRemoteDataSource;
import com.sana.dev.fm.data.datasource.InMemoryProgramsLocalDataSource;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.model.RadioProgram;

import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ProgramsRepositoryCacheIntegrationTest {

    private FakeProgramsRemoteDataSource fakeRemoteDataSource;
    private InMemoryProgramsLocalDataSource localDataSource;
    private FakeClock fakeClock;
    private ProgramsRepositoryImpl repository;

    @Before
    public void setUp() {
        fakeClock = new FakeClock(1000000L);
        fakeRemoteDataSource = new FakeProgramsRemoteDataSource();
        localDataSource = new InMemoryProgramsLocalDataSource(fakeClock);
        repository = new ProgramsRepositoryImpl(fakeRemoteDataSource, localDataSource, "TestDb");
    }

    @Test
    public void networkSuccess_populatesLocalCache() {
        RadioProgram dto = new RadioProgram();
        dto.setProgramId("prog_1");
        dto.setRadioId("station_1");
        dto.setPrName("Fresh Radio Show");
        dto.setDisabled(false);

        fakeRemoteDataSource.setPrograms(Collections.singletonList(dto));

        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("station_1", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());

        // Verify local cache is automatically updated
        List<Program> cached = localDataSource.getCachedPrograms("station_1");
        assertNotNull(cached);
        assertEquals(1, cached.size());
        assertEquals("prog_1", cached.get(0).getId());
    }

    @Test
    public void networkFailure_fallsBackToCachedData_whenOffline() {
        // Step 1: Populate cache via successful initial fetch
        RadioProgram dto = new RadioProgram();
        dto.setProgramId("prog_cached");
        dto.setRadioId("station_1");
        dto.setPrName("Cached Radio Show");
        dto.setDisabled(false);

        fakeRemoteDataSource.setPrograms(Collections.singletonList(dto));
        repository.getProgramsByRadio("station_1", r -> {});

        // Step 2: Simulate network drop (offline exception)
        fakeRemoteDataSource.setException(new IOException("No internet connection"));

        // Step 3: Fetch again - should fallback to cached data seamlessly
        AtomicReference<Result<List<Program>>> offlineResultRef = new AtomicReference<>();
        repository.getProgramsByRadio("station_1", offlineResultRef::set);

        assertNotNull(offlineResultRef.get());
        assertTrue(offlineResultRef.get().isSuccess());
        List<Program> list = offlineResultRef.get().getDataOrNull();
        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("prog_cached", list.get(0).getId());
    }

    @Test
    public void networkFailure_withNoCache_propagatesFailure() {
        fakeRemoteDataSource.setException(new IOException("Network unavailable"));

        AtomicReference<Result<List<Program>>> resultRef = new AtomicReference<>();
        repository.getProgramsByRadio("station_empty", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isFailure());
    }

    @Test
    public void cacheDisabledSeam_bypassesCacheCompletely() {
        RadioProgram dto = new RadioProgram();
        dto.setProgramId("prog_1");
        dto.setRadioId("station_1");
        dto.setPrName("Show");
        dto.setDisabled(false);

        fakeRemoteDataSource.setPrograms(Collections.singletonList(dto));

        // Disable cache via seam
        repository.setCacheEnabled(false);
        assertFalse(repository.isCacheEnabled());

        repository.getProgramsByRadio("station_1", r -> {});

        // Verify cache was NOT populated
        assertNull(localDataSource.getCachedPrograms("station_1"));
    }

    @Test
    public void getProgramById_fallsBackToCacheWhenOffline() {
        RadioProgram dto = new RadioProgram();
        dto.setProgramId("prog_detail");
        dto.setRadioId("station_1");
        dto.setPrName("Detail Show");
        dto.setDisabled(false);

        fakeRemoteDataSource.setPrograms(Collections.singletonList(dto));
        repository.getProgramsByRadio("station_1", r -> {});

        // Network goes down
        fakeRemoteDataSource.setException(new IOException("Offline"));

        AtomicReference<Result<Program>> resultRef = new AtomicReference<>();
        repository.getProgramById("station_1", "prog_detail", resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        assertEquals("prog_detail", resultRef.get().getDataOrNull().getId());
    }
}
