package com.sana.dev.fm.utils.my_firebase.task;

import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;

import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.firebase.firestore.SetOptions;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class FirestoreDbUtility {
    //https://github.com/varunon9/firestore-database-utility/tree/master
    private static final String TOP_LEVEL_COLLECTION = BASE_FB_DB;
//    private static final FirebaseFirestore db = FirebaseFirestore.getInstance();

    private FirebaseFirestore db;
    private static String TAG = "FirestoreDbUtility"; // FirestoreDbUtility.class.getSimpleName();

    public FirestoreDbUtility() {
        db = FirebaseFirestore.getInstance();
    }

    private CollectionReference getTopLevelCollection() {
        return db.collection(TOP_LEVEL_COLLECTION);
    }

    // Get a reference to a specific collection
    private CollectionReference getCollectionReference(String collectionPath) {
        String[] pathSegments = collectionPath.split("/");
//        CollectionReference collectionRef = db.collection(TOP_LEVEL_COLLECTION).document(collectionPath).collection(collectionPath);
        CollectionReference collectionRef = getTopLevelCollection();
        for (String segment : pathSegments) {
            if (!segment.isEmpty()) {
                collectionRef = collectionRef.document(collectionPath).collection(segment);
            }
        }
        return collectionRef;
    }

    public void createOrMerge(final String collectionName, final String documentName,
                              Object object, final CallBack callback) {
        try {
            getCollectionReference(collectionName).document(documentName)
                    .set(object, SetOptions.merge())
                    .addOnSuccessListener(new OnSuccessListener<Void>() {
                        @Override
                        public void onSuccess(Void aVoid) {
                            Log.i(TAG, "createOrMerge success: "
                                    + collectionName
                                    + " "
                                    + documentName);
                            callback.onSuccess(null);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.e(TAG, "createOrMerge failure: "
                                    + collectionName
                                    + " "
                                    + documentName);
                            callback.onFailure(null);
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void update(final String collectionName, final String documentName,
                       final Map<String, Object> hashMap,
                       final CallBack callback) {

        try {
            // overriding updatedAt column to hashMap for all collections
            hashMap.put("updatedAt", new Date());

            getCollectionReference(collectionName).document(documentName)
                    .update(hashMap)
                    .addOnSuccessListener(new OnSuccessListener<Void>() {
                        @Override
                        public void onSuccess(Void aVoid) {
                            Log.i(TAG, "update success: "
                                    + collectionName
                                    + " "
                                    + documentName
                                    + " "
                                    + hashMap.toString()
                            );
                            callback.onSuccess(null);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.e(TAG, "update failure: "
                                    + collectionName
                                    + " "
                                    + documentName);
                            callback.onFailure(null);
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void getOne(final String collectionName, final String documentName,
                       final CallBack callback) {
        try {
            getCollectionReference(collectionName).document(documentName)
                    .get()
                    .addOnSuccessListener(new OnSuccessListener<DocumentSnapshot>() {
                        @Override
                        public void onSuccess(DocumentSnapshot documentSnapshot) {
                            callback.onSuccess(documentSnapshot);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            callback.onFailure(null);
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
            LogUtility.e(TAG, " getOne: " + collectionName + e);
//            Log.d(TAG, document.getId() + " => " + document.getData());

        }
    }

    public void getMany(final String collectionName,
                        final List<FirestoreQuery> queryList,
                        final CallBack callback) {

        try {
            CollectionReference collectionReference = getCollectionReference(collectionName);
            Query query = null;
            for (FirestoreQuery firestoreQuery : queryList) {
                switch (firestoreQuery.getConditionCode()) {
                    case FirestoreQueryConditionCode.WHERE_LESS_THAN: {
                        if (query == null) {
                            query = collectionReference.whereLessThan(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        } else {
                            query = query.whereLessThan(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        }
                        break;
                    }

                    case FirestoreQueryConditionCode.WHERE_EQUAL_TO: {
                        if (query == null) {
                            query = collectionReference.whereEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        } else {
                            query = query.whereEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        }
                        break;
                    }

                    case FirestoreQueryConditionCode.WHERE_GREATER_THAN: {
                        if (query == null) {
                            query = collectionReference.whereGreaterThan(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        } else {
                            query = query.whereGreaterThan(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        }
                        break;
                    }

                    case FirestoreQueryConditionCode.WHERE_LESS_THAN_OR_EQUAL_TO: {
                        if (query == null) {
                            query = collectionReference.whereLessThanOrEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        } else {
                            query = query.whereLessThanOrEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        }
                        break;
                    }

                    case FirestoreQueryConditionCode.WHERE_GREATER_THAN_OR_EQUAL_TO: {
                        if (query == null) {
                            query = collectionReference.whereGreaterThanOrEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        } else {
                            query = query.whereGreaterThanOrEqualTo(
                                    firestoreQuery.getField(),
                                    firestoreQuery.getValue()
                            );
                        }
                        break;
                    }
                }
            }

            Task<QuerySnapshot> task = null;
            if (query == null) {
                task = collectionReference.get();
            } else {
                task = query.get();
            }
            task.addOnSuccessListener(new OnSuccessListener<QuerySnapshot>() {
                        @Override
                        public void onSuccess(QuerySnapshot querySnapshot) {
                            callback.onSuccess(querySnapshot);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            callback.onFailure(e.getMessage());
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
            LogUtility.e(TAG, " getMany: " + collectionName, e);
        }
    }

    public static <T> List<T> getDataFromQuerySnapshot(Object object, Class<T> targetClass) {
        List<T> dataList = new ArrayList<>();
        try {
            if (object instanceof QuerySnapshot) {
                QuerySnapshot querySnapshot = (QuerySnapshot) object;
                for (DocumentSnapshot snapshot : querySnapshot.getDocuments()) {
                    T dataObject = snapshot.toObject(targetClass);

//                    // Assuming targetClass has a field named "isStopped" (modify condition as needed)
//                    if (dataObject != null && !(dataObject instanceof RadioProgram) || (dataObject instanceof RadioProgram && !((RadioProgram) dataObject).isStopped())) {
//                        dataList.add(dataObject);
//                    }else {
                        dataList.add(dataObject);
//                    }
                }
            } else {
                // Handle unexpected object type (log error, throw exception, etc.)
                Log.e(TAG, "Unexpected object type: " + object.getClass().getName());
            }
        } catch (Exception e) {
            LogUtility.e(TAG, " getDataFromQuerySnapshot: ", e);
        }
        return dataList;
    }


}