package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.datasource.BannersRemoteDataSource;
import com.sana.dev.fm.data.dto.BannerDto;
import com.sana.dev.fm.data.mapper.BannerMapper;
import com.sana.dev.fm.domain.model.Banner;
import com.sana.dev.fm.domain.repository.BannersRepository;

import java.util.Collections;
import java.util.List;

/**
 * Implementation of BannersRepository that coordinates BannersRemoteDataSource and BannerMapper.
 */
public class BannersRepositoryImpl implements BannersRepository {

    private final BannersRemoteDataSource remoteDataSource;
    private final String baseDb;

    public BannersRepositoryImpl(BannersRemoteDataSource remoteDataSource) {
        this(remoteDataSource, BuildConfig.BASE_FB_DB);
    }

    public BannersRepositoryImpl(BannersRemoteDataSource remoteDataSource, String baseDb) {
        this.remoteDataSource = remoteDataSource;
        this.baseDb = baseDb;
    }

    @Override
    public void getBanners(Callback<Result<List<Banner>>> callback) {
        if (callback == null) return;

        remoteDataSource.fetchBanners(baseDb, new BannersRemoteDataSource.DataSourceCallback<List<BannerDto>>() {
            @Override
            public void onSuccess(List<BannerDto> dtos) {
                List<Banner> domainBanners = BannerMapper.toDomainList(dtos);
                domainBanners = com.sana.dev.fm.domain.ranking.PriorityRankingEngine.sortBanners(domainBanners);
                callback.onResult(Result.success(domainBanners));
            }

            @Override
            public void onError(Throwable throwable) {
                String message = throwable != null && throwable.getMessage() != null
                        ? throwable.getMessage()
                        : "Failed to fetch banners";
                callback.onResult(Result.failure(new AppError.NetworkError(message, throwable)));
            }
        });
    }
}
