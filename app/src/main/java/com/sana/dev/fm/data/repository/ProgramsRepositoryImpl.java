package com.sana.dev.fm.data.repository;

import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.cache.CacheEntry;
import com.sana.dev.fm.data.datasource.InMemoryProgramsLocalDataSource;
import com.sana.dev.fm.data.datasource.ProgramsLocalDataSource;
import com.sana.dev.fm.data.datasource.ProgramsRemoteDataSource;
import com.sana.dev.fm.data.mapper.ProgramMapper;
import com.sana.dev.fm.domain.model.Program;
import com.sana.dev.fm.domain.repository.ProgramsRepository;
import com.sana.dev.fm.model.RadioProgram;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Concrete implementation of ProgramsRepository with offline caching and TTL support.
 * Coordinates between remote and local data sources.
 */
public class ProgramsRepositoryImpl implements ProgramsRepository {

    private final ProgramsRemoteDataSource remoteDataSource;
    private final ProgramsLocalDataSource localDataSource;
    private final String baseDb;
    private boolean cacheEnabled = true;

    public ProgramsRepositoryImpl(ProgramsRemoteDataSource remoteDataSource) {
        this(remoteDataSource, new InMemoryProgramsLocalDataSource(), BuildConfig.BASE_FB_DB);
    }

    public ProgramsRepositoryImpl(ProgramsRemoteDataSource remoteDataSource, String baseDb) {
        this(remoteDataSource, new InMemoryProgramsLocalDataSource(), baseDb);
    }

    public ProgramsRepositoryImpl(ProgramsRemoteDataSource remoteDataSource, ProgramsLocalDataSource localDataSource, String baseDb) {
        this.remoteDataSource = remoteDataSource;
        this.localDataSource = localDataSource != null ? localDataSource : new InMemoryProgramsLocalDataSource();
        this.baseDb = baseDb != null ? baseDb : BuildConfig.BASE_FB_DB;
    }

    /**
     * Seam to enable or disable local caching (useful for testing and safe rollback).
     */
    public void setCacheEnabled(boolean enabled) {
        this.cacheEnabled = enabled;
    }

    public boolean isCacheEnabled() {
        return cacheEnabled;
    }

    @Override
    public void getProgramsByRadio(String radioId, Callback<Result<List<Program>>> callback) {
        if (callback == null) {
            return;
        }

        if (radioId == null || radioId.trim().isEmpty()) {
            callback.onResult(Result.failure(new AppError.InvalidDataError("radioId", "Station ID must not be empty")));
            return;
        }

        final String cleanRadioId = radioId.trim();

        remoteDataSource.fetchPrograms(baseDb, cleanRadioId, new ProgramsRemoteDataSource.DataSourceCallback<List<RadioProgram>>() {
            @Override
            public void onSuccess(List<RadioProgram> data) {
                List<Program> domainList = new ArrayList<>();
                if (data != null && !data.isEmpty()) {
                    for (RadioProgram item : data) {
                        if (item != null) {
                            domainList.add(ProgramMapper.toDomain(item));
                        }
                    }
                }

                if (cacheEnabled) {
                    localDataSource.savePrograms(cleanRadioId, domainList);
                }

                callback.onResult(Result.success(domainList));
            }

            @Override
            public void onError(Exception exception) {
                // If network/remote fails, check local cache for fallback (Offline-First resilience)
                if (cacheEnabled) {
                    CacheEntry<List<Program>> entry = localDataSource.getCacheEntry(cleanRadioId);
                    if (entry != null && entry.getData() != null && !entry.getData().isEmpty()) {
                        callback.onResult(Result.success(entry.getData()));
                        return;
                    }
                }

                callback.onResult(Result.failure(mapExceptionToAppError(exception)));
            }
        });
    }

    @Override
    public void getProgramById(String radioId, String programId, Callback<Result<Program>> callback) {
        if (callback == null) {
            return;
        }

        if (radioId == null || radioId.trim().isEmpty()) {
            callback.onResult(Result.failure(new AppError.InvalidDataError("radioId", "Station ID must not be empty")));
            return;
        }

        if (programId == null || programId.trim().isEmpty()) {
            callback.onResult(Result.failure(new AppError.InvalidDataError("programId", "Program ID must not be empty")));
            return;
        }

        final String cleanRadioId = radioId.trim();
        final String cleanProgramId = programId.trim();

        remoteDataSource.fetchProgram(baseDb, cleanRadioId, cleanProgramId, new ProgramsRemoteDataSource.DataSourceCallback<RadioProgram>() {
            @Override
            public void onSuccess(RadioProgram data) {
                if (data == null) {
                    callback.onResult(Result.failure(new AppError.NotFoundError(cleanProgramId, "Program not found: " + cleanProgramId)));
                    return;
                }
                callback.onResult(Result.success(ProgramMapper.toDomain(data)));
            }

            @Override
            public void onError(Exception exception) {
                // Fallback to local cache search if available
                if (cacheEnabled) {
                    List<Program> cached = localDataSource.getCachedPrograms(cleanRadioId);
                    if (cached != null) {
                        for (Program p : cached) {
                            if (cleanProgramId.equals(p.getId())) {
                                callback.onResult(Result.success(p));
                                return;
                            }
                        }
                    }
                }

                callback.onResult(Result.failure(mapExceptionToAppError(exception)));
            }
        });
    }

    private AppError mapExceptionToAppError(Exception exception) {
        if (exception == null) {
            return new AppError.UnknownError("Unknown error occurred");
        }
        String msg = exception.getMessage() != null ? exception.getMessage() : exception.toString();
        if (exception instanceof IOException || msg.toLowerCase().contains("network") || msg.toLowerCase().contains("unavailable")) {
            return new AppError.NetworkError(msg, exception);
        }
        if (msg.toLowerCase().contains("permission_denied") || msg.toLowerCase().contains("permission-denied")) {
            return new AppError.PermissionDeniedError(msg, exception);
        }
        return new AppError.UnknownError(msg, exception);
    }
}
