package com.sana.dev.fm.data.datasource;

import androidx.annotation.Nullable;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.EventListener;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QueryDocumentSnapshot;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.core.result.AppError;
import com.sana.dev.fm.core.result.Result;
import com.sana.dev.fm.data.dto.StationDto;
import com.sana.dev.fm.utils.AppConstant;

import java.util.ArrayList;
import java.util.List;

public class FirestoreStationsRemoteDataSource implements StationsRemoteDataSource {

    private final FirebaseFirestore firestore;
    private final String rootCollection;

    public FirestoreStationsRemoteDataSource(FirebaseFirestore firestore) {
        this(firestore, BuildConfig.BASE_FB_DB);
    }

    public FirestoreStationsRemoteDataSource(FirebaseFirestore firestore, String rootCollection) {
        this.firestore = firestore;
        this.rootCollection = (rootCollection != null && !rootCollection.trim().isEmpty())
                ? rootCollection
                : BuildConfig.BASE_FB_DB;
    }

    private CollectionReference getStationsCollection() {
        return firestore.collection(rootCollection).document(AppConstant.Firebase.STATIONS_COLLECTION).collection(AppConstant.Firebase.STATIONS_COLLECTION);
    }

    @Override
    public void getStations(final StationsCallback callback) {
        if (callback == null) return;

        getStationsCollection()
                .orderBy("priority", Query.Direction.DESCENDING)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    List<StationDto> dtoList = parseQuerySnapshot(queryDocumentSnapshots);
                    callback.onResult(Result.success(dtoList));
                })
                .addOnFailureListener(e -> callback.onResult(Result.failure(new AppError.NetworkError("Failed to fetch stations", e))));
    }

    @Override
    public void getStationById(String stationId, final StationCallback callback) {
        if (callback == null) return;
        if (stationId == null || stationId.trim().isEmpty()) {
            callback.onResult(Result.failure(new AppError.InvalidDataError("stationId", "Station ID cannot be empty")));
            return;
        }

        getStationsCollection().document(stationId).get()
                .addOnSuccessListener(documentSnapshot -> {
                    if (documentSnapshot.exists()) {
                        StationDto dto = documentSnapshot.toObject(StationDto.class);
                        if (dto != null) {
                            dto.setId(documentSnapshot.getId());
                        }
                        callback.onResult(Result.success(dto));
                    } else {
                        callback.onResult(Result.failure(new AppError.NotFoundError(stationId, "Station not found: " + stationId)));
                    }
                })
                .addOnFailureListener(e -> callback.onResult(Result.failure(new AppError.NetworkError("Failed to fetch station", e))));
    }

    @Override
    public ListenerRegistration observeStations(final StationsCallback callback) {
        if (callback == null) {
            return () -> {};
        }

        final com.google.firebase.firestore.ListenerRegistration registration = getStationsCollection()
                .orderBy("priority", Query.Direction.DESCENDING)
                .addSnapshotListener(new EventListener<QuerySnapshot>() {
                    @Override
                    public void onEvent(@Nullable QuerySnapshot value, @Nullable FirebaseFirestoreException error) {
                        if (error != null) {
                            callback.onResult(Result.failure(new AppError.NetworkError("Failed to observe stations", error)));
                            return;
                        }
                        if (value != null) {
                            List<StationDto> dtoList = parseQuerySnapshot(value);
                            callback.onResult(Result.success(dtoList));
                        }
                    }
                });

        return new ListenerRegistration() {
            @Override
            public void remove() {
                registration.remove();
            }
        };
    }

    private List<StationDto> parseQuerySnapshot(QuerySnapshot querySnapshot) {
        List<StationDto> list = new ArrayList<>();
        if (querySnapshot == null) return list;

        for (QueryDocumentSnapshot doc : querySnapshot) {
            StationDto dto = doc.toObject(StationDto.class);
            if (dto != null) {
                dto.setId(doc.getId());
                list.add(dto);
            }
        }
        return list;
    }
}
