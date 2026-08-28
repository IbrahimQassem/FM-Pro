package com.sana.dev.fm.domain.repository;

import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.domain.model.Banner;

import java.util.List;

/**
 * Pure domain repository interface for fetching Banners/Advertisements.
 * Independent of Firebase SDK and Android framework classes.
 */
public interface BannersRepository {

    interface Callback<T> {
        void onResult(T result);
    }

    /**
     * Fetches all active banners/advertisements.
     *
     * @param callback Callback delivering Result with list of canonical Banner entities.
     */
    void getBanners(Callback<Result<List<Banner>>> callback);
}
