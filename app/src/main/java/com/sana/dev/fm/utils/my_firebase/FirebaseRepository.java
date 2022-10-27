package com.sana.dev.fm.utils.my_firebase;


import static com.sana.dev.fm.utils.my_firebase.AppConstant.FAIL;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.DocumentChange;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.EventListener;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.MetadataChanges;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.firestore.WriteBatch;

import java.util.Map;



public abstract class FirebaseRepository<T> {

    /**
     * Insert data on FireStore
     *
     * @param documentReference Document reference of data to be add
     * @param model             Model to insert into Document
     * @param callback          callback for event handling
     */
    protected final void fireStoreCreate(final DocumentReference documentReference, final Object model, final CallBack callback) {
        documentReference.set(model).addOnSuccessListener(new OnSuccessListener<Void>() {
            @Override
            public void onSuccess(Void aVoid) {
                callback.onSuccess(AppConstant.SUCCESS);
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                callback.onError(e);
            }
        });
    }

    /**
     * Update data to FireStore
     *
     * @param documentReference Document reference of data to update
     * @param map               Data map to update
     * @param callback          callback for event handling
     */
    protected final void fireStoreUpdate(final DocumentReference documentReference, final Map<String, Object> map, final CallBack callback) {
        documentReference.update(map).addOnSuccessListener(new OnSuccessListener<Void>() {
            @Override
            public void onSuccess(Void aVoid) {
                callback.onSuccess(AppConstant.SUCCESS);
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                callback.onError(e);
            }
        });
    }

    /**
     * Update data to FireStore
     *
     * @param documentReference Document reference of data to update
     * @param map               Data map to update
     * @param callback          callback for event handling
     */
    protected final void arrayUpdate(final DocumentReference documentReference,String key , final Map<String, Object> map, final CallBack callback) {

//        //Map to remove user from array
//        final Map<String, Object> removeFromArrayMap = new HashMap<>();
//        removeFromArrayMap.put(key, FieldValue.arrayRemove(map));
//        //Map to add user to array
//        final Map<String, Object> addToArrayMap = new HashMap<>();
//        addToArrayMap.put(key, FieldValue.arrayUnion(map));

        //Map to add user to array
//        final Map<String, Object> addToArrayMap = new HashMap<>();
//        addToArrayMap.put(key, FieldValue.arrayUnion(map));
//        //Map to remove user from array
//        final Map<String, Object> removeFromArrayMap = new HashMap<>();
//        removeFromArrayMap.put(key, FieldValue.arrayRemove(map));

//        documentReference.set(key, FieldValue.arrayRemove(map));
//        documentReference.set(key, FieldValue.arrayUnion(map)).addOnSuccessListener(new OnSuccessListener<Void>() {
//            @Override
//            public void onSuccess(Void aVoid) {
//                callback.onSuccess(Constant.SUCCESS);
//            }
//        }).addOnFailureListener(new OnFailureListener() {
//            @Override
//            public void onFailure(@NonNull Exception e) {
//                callback.onError(e);
//            }
//        });
    }


    /**
     * FireStore Create or Merge
     *
     * @param documentReference Document reference of data to create update
     * @param model             Model to create or update into Document
     */
    protected final void fireStoreCreateOrMerge(final DocumentReference documentReference, final Object model, final CallBack callback) {
        documentReference.set(model, SetOptions.merge()).addOnSuccessListener(new OnSuccessListener<Void>() {
            @Override
            public void onSuccess(Void aVoid) {
                callback.onSuccess(AppConstant.SUCCESS);
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                callback.onError(e);
            }
        });
    }

    /**
     * Delete data from FireStore
     *
     * @param documentReference Document reference of data to delete
     * @param callback          callback for event handling
     */
    protected final void fireStoreDelete(final DocumentReference documentReference, final CallBack callback) {
        documentReference.delete().addOnSuccessListener(new OnSuccessListener<Void>() {
            @Override
            public void onSuccess(Void aVoid) {
                callback.onSuccess(AppConstant.SUCCESS);
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                callback.onError(e);
            }
        });
    }

    /**
     * FireStore Batch write
     *
     * @param batch    Document reference of data to delete
     * @param callback callback for event handling
     */
    protected final void batchWrite(WriteBatch batch, final CallBack callback) {
        batch.commit().addOnCompleteListener(new OnCompleteListener<Void>() {
            @Override
            public void onComplete(@NonNull Task<Void> task) {
                if (task.isSuccessful())
                    callback.onSuccess(AppConstant.SUCCESS);
                else
                    callback.onError(FAIL);
            }
        });
    }

    /**
     * One time data fetch from FireStore with Document reference
     *
     * @param documentReference query of Document reference to fetch data
     * @param callBack          callback for event handling
     */
    protected final void readDocument(final DocumentReference documentReference, final CallBack callBack) {
        documentReference.get().addOnCompleteListener(new OnCompleteListener<DocumentSnapshot>() {
            @Override
            public void onComplete(@NonNull Task<DocumentSnapshot> task) {
                if (task.isSuccessful()) {
                    DocumentSnapshot document = task.getResult();
                    if (document != null && document.exists()) {
                        callBack.onSuccess(document);
                    } else {
                        callBack.onSuccess(null);
                    }
                } else {
                    callBack.onError(task.getException());
                }
            }
        });
    }

    /**
     * One time data fetch from FireStore with Document reference
     *
     * @param documentReference query of Document reference to fetch data
     * @param callBack          callback for event handling
     */
    protected final void readDocumentBy(final DocumentReference documentReference, final CallBack callBack) {
        documentReference.get().addOnCompleteListener(new OnCompleteListener<DocumentSnapshot>() {
            @Override
            public void onComplete(@NonNull Task<DocumentSnapshot> task) {
                if (task.isSuccessful()) {
                    DocumentSnapshot document = task.getResult();
                    if (document != null && document.exists()) {
                        callBack.onSuccess(document.getData());
                    } else {
                        callBack.onSuccess(null);
                    }
                } else {
                    callBack.onError(task.getException());
                }
            }
        });
    }

    /**
     * Data fetch listener with Document reference
     *
     * @param documentReference to add childEvent listener
     * @param callBack          callback for event handling
     * @return EventListener
     */
    protected final ListenerRegistration readDocumentByListener(final DocumentReference documentReference, final CallBack callBack) {
        return documentReference.addSnapshotListener(new EventListener<DocumentSnapshot>() {
            @Override
            public void onEvent(@Nullable DocumentSnapshot snapshot,
                                @Nullable FirebaseFirestoreException e) {
                if (e != null) {
                    callBack.onError(e);
                    return;
                }
                if (snapshot != null && snapshot.exists()) {
                    callBack.onSuccess(snapshot);
                } else {
                    callBack.onSuccess(null);
                }
            }
        });
    }

    /**
     * One time data fetch from FireStore with Query reference
     *
     * @param query    query of Document reference to fetch data
     * @param callBack callback for event handling
     */
    protected final void readQueryDocuments(final Query query, final CallBack callBack) {
        query.get().addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
            @Override
            public void onComplete(@NonNull Task<QuerySnapshot> task) {
                if (task.isSuccessful()) {
                    QuerySnapshot querySnapshot = task.getResult();
                    if (querySnapshot != null && !querySnapshot.isEmpty()) {
                        callBack.onSuccess(querySnapshot);
                    } else {
                        callBack.onSuccess(null);
                    }
                } else {
                    callBack.onError(task.getException());
                }
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                callBack.onError(e);
            }
        });
    }

    /**
     * Data fetch listener with Query reference
     *
     * @param query    query of Document reference to fetch data
     * @param callBack callback for event handling
     */
    protected final ListenerRegistration readQueryDocumentsByListener(final Query query, final CallBack callBack) {
        return query.addSnapshotListener(new EventListener<QuerySnapshot>() {
            @Override
            public void onEvent(@Nullable QuerySnapshot value,
                                @Nullable FirebaseFirestoreException e) {
                if (e != null) {
                    callBack.onError(e);
                    return;
                }
                callBack.onSuccess(value);
            }
        });
    }

    /**
     * Data fetch ChildEventListener with Query reference
     *
     * @param query    to add childEvent listener
     * @param callBack callback for event handling
     * @return ChildEventListener
     */
    protected final ListenerRegistration readQueryDocumentsByChildEventListener(final Query query, final FirebaseChildCallBack callBack) {
        return query.addSnapshotListener(new EventListener<QuerySnapshot>() {
            @Override
            public void onEvent(@Nullable QuerySnapshot snapshots,
                                @Nullable FirebaseFirestoreException e) {
                if (e != null || snapshots == null || snapshots.isEmpty()) {
                    callBack.onCancelled(e);
                    return;
                }
                for (DocumentChange documentChange : snapshots.getDocumentChanges()) {
                    switch (documentChange.getType()) {
                        case ADDED:
                            callBack.onChildAdded(documentChange.getDocument());
                            break;
                        case MODIFIED:
                            callBack.onChildChanged(documentChange.getDocument());
                            break;
                        case REMOVED:
                            callBack.onChildRemoved(documentChange.getDocument());
                            break;
                    }
                }
            }
        });
    }

    /**
     * REad offline data from FireBase
     *
     * @param query Document reference of data to create
     */
    protected final void fireStoreOfflineRead(final Query query, final CallBack callBack) {
        query.addSnapshotListener(MetadataChanges.INCLUDE, new EventListener<QuerySnapshot>() {
            @Override
            public void onEvent(@Nullable QuerySnapshot querySnapshot,
                                @Nullable FirebaseFirestoreException e) {
                if (e != null) {
                    callBack.onError(e);
                    return;
                }
                callBack.onSuccess(querySnapshot);
            }
        });
    }


}