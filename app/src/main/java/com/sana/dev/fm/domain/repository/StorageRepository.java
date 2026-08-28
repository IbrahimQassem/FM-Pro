package com.sana.dev.fm.domain.repository;

public interface StorageRepository {

    interface UploadCallback {
        void onSuccess(String downloadUrl, String storagePath);
        void onFailure(Exception exception);
    }

    interface DeleteCallback {
        void onSuccess();
        void onFailure(Exception exception);
    }

    void uploadUserAvatar(String uid, byte[] imageBytes, UploadCallback callback);

    void uploadStationLogo(String stationId, byte[] imageBytes, UploadCallback callback);

    void uploadProgramCover(String programId, byte[] imageBytes, UploadCallback callback);

    void uploadEpisodeCover(String episodeId, byte[] imageBytes, UploadCallback callback);

    void uploadEpisodeAudio(String episodeId, byte[] audioBytes, UploadCallback callback);

    void uploadBannerImage(String bannerId, byte[] imageBytes, UploadCallback callback);

    void deleteAsset(String storagePath, DeleteCallback callback);
}
