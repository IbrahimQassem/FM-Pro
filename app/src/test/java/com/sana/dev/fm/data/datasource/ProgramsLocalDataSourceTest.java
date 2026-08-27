package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.core.time.FakeClock;
import com.sana.dev.fm.data.cache.CacheEntry;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.model.ScheduleTime;

import org.junit.Before;
import org.junit.Test;

import java.util.Collections;
import java.util.List;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

public class ProgramsLocalDataSourceTest {

    private FakeClock fakeClock;
    private InMemoryProgramsLocalDataSource localDataSource;

    @Before
    public void setUp() {
        fakeClock = new FakeClock(1000000L);
        localDataSource = new InMemoryProgramsLocalDataSource(fakeClock);
    }

    @Test
    public void getCachedPrograms_whenEmpty_returnsNull() {
        assertNull(localDataSource.getCachedPrograms("station_1"));
    }

    @Test
    public void saveAndGetCachedPrograms_returnsSavedProgramsWithinTtl() {
        Program program = new Program("p1", "station_1", "Morning Show", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        List<Program> list = Collections.singletonList(program);

        localDataSource.savePrograms("station_1", list, 5000L);

        List<Program> cached = localDataSource.getCachedPrograms("station_1");
        assertNotNull(cached);
        assertEquals(1, cached.size());
        assertEquals("p1", cached.get(0).getId());
    }

    @Test
    public void getCachedPrograms_afterTtlExpires_returnsNull() {
        Program program = new Program("p1", "station_1", "Morning Show", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        localDataSource.savePrograms("station_1", Collections.singletonList(program), 5000L);

        // Advance clock past TTL (5001 ms)
        fakeClock.advanceBy(5001L);

        assertNull(localDataSource.getCachedPrograms("station_1"));

        // Raw cache entry is still present for offline fallback inspection
        CacheEntry<List<Program>> rawEntry = localDataSource.getCacheEntry("station_1");
        assertNotNull(rawEntry);
        assertTrue(rawEntry.isExpired(fakeClock.currentTimeMillis()));
        assertEquals(1, rawEntry.getData().size());
    }

    @Test
    public void clearCache_removesEntryForStation() {
        Program program = new Program("p1", "station_1", "Morning Show", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        localDataSource.savePrograms("station_1", Collections.singletonList(program));

        localDataSource.clearCache("station_1");

        assertNull(localDataSource.getCachedPrograms("station_1"));
        assertNull(localDataSource.getCacheEntry("station_1"));
    }

    @Test
    public void clearAll_removesAllEntries() {
        Program p1 = new Program("p1", "station_1", "Show 1", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());
        Program p2 = new Program("p2", "station_2", "Show 2", "Desc", Collections.emptyList(), "", "", 0, 0, 0, 0, "", "", false, "", ScheduleTime.empty());

        localDataSource.savePrograms("station_1", Collections.singletonList(p1));
        localDataSource.savePrograms("station_2", Collections.singletonList(p2));

        localDataSource.clearAll();

        assertNull(localDataSource.getCachedPrograms("station_1"));
        assertNull(localDataSource.getCachedPrograms("station_2"));
    }
}
