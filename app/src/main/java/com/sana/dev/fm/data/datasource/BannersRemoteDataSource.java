package com.sana.dev.fm.data.datasource;

import com.sana.dev.fm.data.dto.BannerDto;

import java.util.List;

/**
 * Remote data source contract for fetching Banners from Firestore or API.
 */
public interface BannersRemoteDataSource {

    interface DataSourceCallback<T> {
        void onSuccess(T data);
        void onError(Throwable throwable);
    }

    /**
     * Fetches banners from the given root database path.
     *
     * @param baseDb   Root collection name for current flavor.
     * @param callback Callback delivering list of BannerDto objects.
     */
    void fetchBanners(String baseDb, DataSourceCallback<List<BannerDto>> callback);
}
