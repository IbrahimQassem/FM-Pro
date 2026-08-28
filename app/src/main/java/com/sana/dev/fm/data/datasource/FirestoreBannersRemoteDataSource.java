package com.sana.dev.fm.data.datasource;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.data.dto.BannerDto;
import com.sana.dev.fm.utils.AppConstant;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Concrete Firebase Firestore implementation of BannersRemoteDataSource.
 * Completely defensive manual snapshot extractor to prevent deserialization crashes across all environments.
 */
public class FirestoreBannersRemoteDataSource implements BannersRemoteDataSource {

    private final FirebaseFirestore firestore;

    public FirestoreBannersRemoteDataSource() {
        this(FirebaseFirestore.getInstance());
    }

    public FirestoreBannersRemoteDataSource(FirebaseFirestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference getBannersCollection(String baseDb) {
        return firestore.collection(baseDb)
                .document(AppConstant.Firebase.BANNERS_COLLECTION)
                .collection(AppConstant.Firebase.BANNERS_COLLECTION);
    }

    @Override
    public void fetchBanners(String baseDb, DataSourceCallback<List<BannerDto>> callback) {
        if (baseDb == null || baseDb.trim().isEmpty()) {
            if (callback != null) {
                callback.onError(new IllegalArgumentException("baseDb must not be empty"));
            }
            return;
        }

        getBannersCollection(baseDb.trim())
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    List<BannerDto> banners = new ArrayList<>();
                    if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                        for (DocumentSnapshot doc : queryDocumentSnapshots.getDocuments()) {
                            BannerDto dto = new BannerDto();
                            dto.setId(doc.getId());

                            String title = doc.getString("title");
                            if (title == null) title = doc.getString("name");
                            dto.setTitle(title != null ? title : "");

                            String imageUrl = doc.getString("imageUrl");
                            dto.setImageUrl(imageUrl != null ? imageUrl : "");

                            String targetUrl = doc.getString("targetUrl");
                            dto.setTargetUrl(targetUrl != null ? targetUrl : "");

                            String targetType = doc.getString("targetType");
                            dto.setTargetType(targetType != null ? targetType : "EXTERNAL_URL");

                            String targetId = doc.getString("targetId");
                            dto.setTargetId(targetId != null ? targetId : "");

                            String placement = doc.getString("placement");
                            dto.setPlacement(placement != null ? placement : "HOME_TOP");

                            Long priority = doc.getLong("priority");
                            dto.setPriority(priority != null ? priority.intValue() : 0);

                            Boolean active = doc.getBoolean("active");
                            if (active == null) active = doc.getBoolean("isActive");
                            dto.setActive(active != null ? active : true);

                            Object statsObj = doc.get("stats");
                            if (statsObj instanceof Map) {
                                try {
                                    @SuppressWarnings("unchecked")
                                    Map<String, Long> stats = (Map<String, Long>) statsObj;
                                    dto.setStats(stats);
                                } catch (Exception ignored) {
                                }
                            }

                            dto.setStartAt(doc.get("startAt"));
                            dto.setExpiresAt(doc.get("expiresAt"));
                            dto.setCreatedAt(doc.get("createdAt"));

                            banners.add(dto);
                        }
                    }
                    if (callback != null) {
                        callback.onSuccess(banners);
                    }
                })
                .addOnFailureListener(e -> {
                    if (callback != null) {
                        callback.onError(e);
                    }
                });
    }
}
