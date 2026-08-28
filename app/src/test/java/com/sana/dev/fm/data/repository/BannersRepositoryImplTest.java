package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.datasource.BannersRemoteDataSource;
import com.sana.dev.fm.data.dto.BannerDto;
import com.sana.dev.fm.domain.model.Banner;

import org.junit.Before;
import org.junit.Test;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

public class BannersRepositoryImplTest {

    private FakeBannersRemoteDataSource fakeDataSource;
    private BannersRepositoryImpl repository;

    @Before
    public void setUp() {
        fakeDataSource = new FakeBannersRemoteDataSource();
        repository = new BannersRepositoryImpl(fakeDataSource, "TestDb");
    }

    @Test
    public void getBanners_success_returnsSortedDomainListByPriorityDescending() {
        BannerDto b1 = new BannerDto();
        b1.setId("b1");
        b1.setTitle("Low priority banner");
        b1.setPriority(1);

        BannerDto b2 = new BannerDto();
        b2.setId("b2");
        b2.setTitle("High priority banner");
        b2.setPriority(10);

        fakeDataSource.setBanners(Arrays.asList(b1, b2));

        AtomicReference<Result<List<Banner>>> resultRef = new AtomicReference<>();
        repository.getBanners(resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        List<Banner> banners = resultRef.get().getDataOrNull();
        assertNotNull(banners);
        assertEquals(2, banners.size());
        // Highest priority first
        assertEquals("b2", banners.get(0).getId());
        assertEquals(10, banners.get(0).getPriority());
        assertEquals("b1", banners.get(1).getId());
        assertEquals(1, banners.get(1).getPriority());
    }

    @Test
    public void getBanners_networkFailure_returnsError() {
        fakeDataSource.setException(new IOException("Timeout"));

        AtomicReference<Result<List<Banner>>> resultRef = new AtomicReference<>();
        repository.getBanners(resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isFailure());
    }

    @Test
    public void getBanners_emptyResult_returnsEmptyList() {
        fakeDataSource.setBanners(Collections.emptyList());

        AtomicReference<Result<List<Banner>>> resultRef = new AtomicReference<>();
        repository.getBanners(resultRef::set);

        assertNotNull(resultRef.get());
        assertTrue(resultRef.get().isSuccess());
        assertTrue(resultRef.get().getDataOrNull().isEmpty());
    }

    private static class FakeBannersRemoteDataSource implements BannersRemoteDataSource {
        private List<BannerDto> banners = new ArrayList<>();
        private Throwable exception;

        public void setBanners(List<BannerDto> banners) {
            this.banners = banners;
            this.exception = null;
        }

        public void setException(Throwable exception) {
            this.exception = exception;
        }

        @Override
        public void fetchBanners(String baseDb, DataSourceCallback<List<BannerDto>> callback) {
            if (exception != null) {
                callback.onError(exception);
            } else {
                callback.onSuccess(banners);
            }
        }
    }
}
