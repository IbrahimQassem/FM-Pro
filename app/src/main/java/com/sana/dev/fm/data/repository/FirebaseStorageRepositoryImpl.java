package com.sana.dev.fm.data.repository;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.domain.repository.StorageRepository;
import com.sana.dev.fm.utils.AppConstant;

import java.io.ByteArrayOutputStream;

public class FirebaseStorageRepositoryImpl implements StorageRepository {

    private final FirebaseStorage storage;
    private final String rootFolder;

    private static final String MIME_WEBP = "image/webp";
    private static final String MIME_AUDIO_MPEG = "audio/mpeg";
    private static final String CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000";

    public FirebaseStorageRepositoryImpl(FirebaseStorage storage) {
        this(storage, BuildConfig.BASE_FB_DB);
    }

    public FirebaseStorageRepositoryImpl(FirebaseStorage storage, String rootFolder) {
        this.storage = storage;
        this.rootFolder = (rootFolder != null && !rootFolder.trim().isEmpty())
                ? rootFolder
                : BuildConfig.BASE_FB_DB;
    }

    @Override
    public void uploadUserAvatar(String uid, byte[] imageBytes, UploadCallback callback) {
        if (uid == null || uid.trim().isEmpty() || imageBytes == null || imageBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid user id or empty image payload"));
            return;
        }
        byte[] webpBytes = compressToWebP(imageBytes, 80);
        String path = rootFolder + "/" + AppConstant.StoragePaths.USERS_DIR + "/" + uid + "/avatar.webp";
        uploadData(path, webpBytes, MIME_WEBP, callback);
    }

    @Override
    public void uploadStationLogo(String stationId, byte[] imageBytes, UploadCallback callback) {
        if (stationId == null || stationId.trim().isEmpty() || imageBytes == null || imageBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid station id or empty image payload"));
            return;
        }
        byte[] webpBytes = compressToWebP(imageBytes, 85);
        String path = rootFolder + "/" + AppConstant.StoragePaths.STATIONS_DIR + "/" + stationId + "/logo.webp";
        uploadData(path, webpBytes, MIME_WEBP, callback);
    }

    @Override
    public void uploadProgramCover(String programId, byte[] imageBytes, UploadCallback callback) {
        if (programId == null || programId.trim().isEmpty() || imageBytes == null || imageBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid program id or empty image payload"));
            return;
        }
        byte[] webpBytes = compressToWebP(imageBytes, 85);
        String path = rootFolder + "/" + AppConstant.StoragePaths.PROGRAMS_DIR + "/" + programId + "/cover.webp";
        uploadData(path, webpBytes, MIME_WEBP, callback);
    }

    @Override
    public void uploadEpisodeCover(String episodeId, byte[] imageBytes, UploadCallback callback) {
        if (episodeId == null || episodeId.trim().isEmpty() || imageBytes == null || imageBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid episode id or empty image payload"));
            return;
        }
        byte[] webpBytes = compressToWebP(imageBytes, 85);
        String path = rootFolder + "/" + AppConstant.StoragePaths.EPISODES_DIR + "/" + episodeId + "/cover.webp";
        uploadData(path, webpBytes, MIME_WEBP, callback);
    }

    @Override
    public void uploadEpisodeAudio(String episodeId, byte[] audioBytes, UploadCallback callback) {
        if (episodeId == null || episodeId.trim().isEmpty() || audioBytes == null || audioBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid episode id or empty audio payload"));
            return;
        }
        String path = rootFolder + "/" + AppConstant.StoragePaths.EPISODES_DIR + "/" + episodeId + "/audio.mp3";
        uploadData(path, audioBytes, MIME_AUDIO_MPEG, callback);
    }

    @Override
    public void uploadBannerImage(String bannerId, byte[] imageBytes, UploadCallback callback) {
        if (bannerId == null || bannerId.trim().isEmpty() || imageBytes == null || imageBytes.length == 0) {
            callback.onFailure(new IllegalArgumentException("Invalid banner id or empty image payload"));
            return;
        }
        byte[] webpBytes = compressToWebP(imageBytes, 85);
        String path = rootFolder + "/" + AppConstant.StoragePaths.BANNERS_DIR + "/" + bannerId + "/banner.webp";
        uploadData(path, webpBytes, MIME_WEBP, callback);
    }

    @Override
    public void deleteAsset(String storagePath, DeleteCallback callback) {
        if (storagePath == null || storagePath.trim().isEmpty()) {
            callback.onFailure(new IllegalArgumentException("Storage path cannot be empty"));
            return;
        }
        StorageReference ref = storage.getReference().child(storagePath);
        ref.delete().addOnCompleteListener(new OnCompleteListener<Void>() {
            @Override
            public void onComplete(@NonNull Task<Void> task) {
                if (task.isSuccessful()) {
                    callback.onSuccess();
                } else {
                    callback.onFailure(task.getException() != null ? task.getException() : new Exception("Delete failed"));
                }
            }
        });
    }

    private void uploadData(final String path, byte[] data, String mimeType, final UploadCallback callback) {
        final StorageReference ref = storage.getReference().child(path);
        StorageMetadata metadata = new StorageMetadata.Builder()
                .setContentType(mimeType)
                .setCacheControl(CACHE_CONTROL_IMMUTABLE)
                .build();

        ref.putBytes(data, metadata).addOnCompleteListener(new OnCompleteListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onComplete(@NonNull Task<UploadTask.TaskSnapshot> task) {
                if (task.isSuccessful()) {
                    ref.getDownloadUrl().addOnCompleteListener(new OnCompleteListener<android.net.Uri>() {
                        @Override
                        public void onComplete(@NonNull Task<android.net.Uri> urlTask) {
                            if (urlTask.isSuccessful() && urlTask.getResult() != null) {
                                callback.onSuccess(urlTask.getResult().toString(), path);
                            } else {
                                callback.onFailure(urlTask.getException() != null ? urlTask.getException() : new Exception("Failed to fetch download url"));
                            }
                        }
                    });
                } else {
                    callback.onFailure(task.getException() != null ? task.getException() : new Exception("Upload failed"));
                }
            }
        });
    }

    public static byte[] compressToWebP(byte[] inputBytes, int quality) {
        try {
            Bitmap bitmap = BitmapFactory.decodeByteArray(inputBytes, 0, inputBytes.length);
            if (bitmap == null) {
                return inputBytes; // Return original if not decodeable
            }
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.R) {
                bitmap.compress(Bitmap.CompressFormat.WEBP_LOSSY, quality, baos);
            } else {
                bitmap.compress(Bitmap.CompressFormat.WEBP, quality, baos);
            }
            bitmap.recycle();
            return baos.toByteArray();
        } catch (Exception e) {
            return inputBytes;
        }
    }
}
