package com.sana.dev.fm.data.datasource;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.utils.AppConstant;

import java.util.ArrayList;
import java.util.List;

/**
 * Concrete Firebase Firestore implementation of ProgramsRemoteDataSource.
 * Scoped by baseDb root and station radioId.
 */
public class FirestoreProgramsRemoteDataSource implements ProgramsRemoteDataSource {

    private final FirebaseFirestore firestore;

    public FirestoreProgramsRemoteDataSource() {
        this(FirebaseFirestore.getInstance());
    }

    public FirestoreProgramsRemoteDataSource(FirebaseFirestore firestore) {
        this.firestore = firestore;
    }

    private CollectionReference getProgramsCollection(String baseDb, String radioId) {
        return firestore.collection(baseDb)
                .document(AppConstant.Firebase.RADIO_PROGRAM_TABLE)
                .collection(radioId)
                .document(AppConstant.Firebase.RADIO_PROGRAM_TABLE)
                .collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE);
    }

    @Override
    public void fetchPrograms(String baseDb, String radioId, DataSourceCallback<List<RadioProgram>> callback) {
        if (baseDb == null || baseDb.trim().isEmpty() || radioId == null || radioId.trim().isEmpty()) {
            if (callback != null) {
                callback.onError(new IllegalArgumentException("baseDb and radioId must not be empty"));
            }
            return;
        }

        getProgramsCollection(baseDb.trim(), radioId.trim())
                .whereEqualTo("disabled", false)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    List<RadioProgram> programs = new ArrayList<>();
                    if (queryDocumentSnapshots != null && !queryDocumentSnapshots.isEmpty()) {
                        for (DocumentSnapshot doc : queryDocumentSnapshots.getDocuments()) {
                            RadioProgram item = doc.toObject(RadioProgram.class);
                            if (item != null) {
                                if (item.getProgramId() == null || item.getProgramId().isEmpty()) {
                                    item.setProgramId(doc.getId());
                                }
                                programs.add(item);
                            }
                        }
                    }
                    if (callback != null) {
                        callback.onSuccess(programs);
                    }
                })
                .addOnFailureListener(e -> {
                    if (callback != null) {
                        callback.onError(e);
                    }
                });
    }

    @Override
    public void fetchProgram(String baseDb, String radioId, String programId, DataSourceCallback<RadioProgram> callback) {
        if (baseDb == null || baseDb.trim().isEmpty() || radioId == null || radioId.trim().isEmpty() || programId == null || programId.trim().isEmpty()) {
            if (callback != null) {
                callback.onError(new IllegalArgumentException("baseDb, radioId and programId must not be empty"));
            }
            return;
        }

        getProgramsCollection(baseDb.trim(), radioId.trim())
                .document(programId.trim())
                .get()
                .addOnSuccessListener(doc -> {
                    if (doc != null && doc.exists()) {
                        RadioProgram item = doc.toObject(RadioProgram.class);
                        if (item != null && (item.getProgramId() == null || item.getProgramId().isEmpty())) {
                            item.setProgramId(doc.getId());
                        }
                        if (callback != null) {
                            callback.onSuccess(item);
                        }
                    } else {
                        if (callback != null) {
                            callback.onSuccess(null);
                        }
                    }
                })
                .addOnFailureListener(e -> {
                    if (callback != null) {
                        callback.onError(e);
                    }
                });
    }
}
