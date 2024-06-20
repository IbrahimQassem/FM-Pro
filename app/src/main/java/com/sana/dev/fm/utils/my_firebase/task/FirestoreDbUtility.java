package com.sana.dev.fm.utils.my_firebase.task;

import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;

import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.firebase.firestore.SetOptions;
import com.google.gson.Gson;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Map;

public class FirestoreDbUtility {
    //https://github.com/varunon9/firestore-database-utility/tree/master
    private static final String TOP_LEVEL_COLLECTION = BASE_FB_DB;//+ "_16";
    //    private static final FirebaseFirestore db = FirebaseFirestore.getInstance();
    private FirebaseFirestore db;
    private static String TAG = "FirestoreDbUtility"; // FirestoreDbUtility.class.getSimpleName();

    public FirestoreDbUtility() {
        db = FirebaseFirestore.getInstance();
    }

    public CollectionReference getTopLevelCollection() {
        return db.collection(TOP_LEVEL_COLLECTION);
//        return db.collection(TOP_LEVEL_COLLECTION).getFirestore().collection(TOP_LEVEL_COLLECTION).document().getParent();
    }

    // Get a reference to a specific collection
    public CollectionReference getCollectionReference(String collectionPath, String docId) {
//        String[] pathSegments = collectionPath.split("/");
        CollectionReference collectionRef = getTopLevelCollection();
        collectionRef = collectionRef.document(collectionPath).collection(docId);

//        for (String segment : pathSegments) {
//            if (!segment.isEmpty()) {
////                collectionRef = collectionRef.collection(segment);
//                collectionRef = collectionRef.document(collectionPath).collection(docId);
//            }
//        }
        return collectionRef;
    }

    //    // Get a document by its ID from a specific collection
    public DocumentReference getDocument(String collectionPath, String documentId) {
//        DocumentReference washingtonRef = db.collection("cities").document("DC");
        return getCollectionReference(collectionPath, documentId).document(documentId);
    }


    public CollectionReference getKeyId(String collectionPath) {
        CollectionReference colRef = getTopLevelCollection().getFirestore().collection(collectionPath);
        return colRef;
    }


    public void createOrMerge(final CollectionReference collectionReference,
                              final String documentName,
                              Object object, final CallBack callback) {
        try {
            collectionReference.document(documentName)
                    .set(object, SetOptions.merge())
                    .addOnSuccessListener(new OnSuccessListener<Void>() {
                        @Override
                        public void onSuccess(Void aVoid) {
                            Log.i(TAG, "createOrMerge success: "
                                    + collectionReference.getParent()
                                    + " "
                                    + documentName);
                            callback.onSuccess(null);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            Log.e(TAG, "createOrMerge failure: "
                                    + collectionReference.getParent()
                                    + " "
                                    + documentName);
                            callback.onFailure(e.getMessage());
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
            Log.e(TAG, "createOrMerge Exception: " + collectionReference.getParent() + " " + documentName + " " + e);
            callback.onFailure(e.getMessage());
        }
    }

    public void update(final CollectionReference collectionReference, final String documentName,
                       final Map<String, Object> hashMap,
                       final CallBack callback) {

        try {
            // overriding updatedAt column to hashMap for all collections
            hashMap.put("updatedAt", new Date());

            collectionReference.document(documentName)
                    .update(hashMap)
                    .addOnSuccessListener(new OnSuccessListener<Void>() {
                        @Override
                        public void onSuccess(Void aVoid) {
                            Log.i(TAG, "update success: "
                                    + collectionReference.getParent()
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
                                    + collectionReference.getParent()
                                    + " "
                                    + documentName);
                            callback.onFailure(e.getMessage());
                        }
                    });
        } catch (Exception e) {
            e.printStackTrace();
            Log.e(TAG, "update Exception: " + collectionReference.getParent() + " " + documentName + " " + e);
            callback.onFailure(e.getMessage());
        }
    }

    //    // Example: Delete a document by ID
    public void deleteDocument(final CollectionReference collectionReference, final String documentId, CallBack callback) {
        CollectionReference collectionRef = collectionReference;
        // Get a DocumentReference for the document you want to delete (replace "documentId" with the actual ID)
        DocumentReference docRef = collectionRef.document(documentId);

        // Delete the document
        docRef.delete()
                .addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        callback.onSuccess(task.getResult());
                    }
                });
    }

    public void getOne(final CollectionReference collectionReference,
                       final String documentName,
                       final CallBack callback) {
        try {
            collectionReference.document(documentName)
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
//            Log.d(TAG, document.getId() + " => " + document.getData());
            Log.e(TAG, "getOne Exception: " + collectionReference.getParent() + " " + documentName + " " + e);
            callback.onFailure(e.getMessage());
        }
    }

    public void getMany(final CollectionReference reference,
                        final List<FirestoreQuery> queryList,
                        final CallBack callback) {

        try {
            CollectionReference collectionReference = reference;
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

                    case FirestoreQueryConditionCode.Query_Direction_DESCENDING: {
                        if (query == null) {
                            query = collectionReference.orderBy(
                                    firestoreQuery.getField(),
                                    Query.Direction.DESCENDING
                            );
                        } else {
                            query = query.orderBy(
                                    firestoreQuery.getField(),
                                    Query.Direction.DESCENDING
                            );
                        }
                        break;
                    }

                    case FirestoreQueryConditionCode.Query_Direction_ASCENDING: {
                        if (query == null) {
                            query = collectionReference.orderBy(
                                    firestoreQuery.getField(),
                                    Query.Direction.ASCENDING
                            );
                        } else {
                            query = query.orderBy(
                                    firestoreQuery.getField(),
                                    Query.Direction.ASCENDING
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
            LogUtility.e(TAG, " getMany: " + reference.getParent(), e);
            callback.onFailure(e.getMessage());
        }
    }

    public static <T> List<T> getDataFromQuerySnapshot(Object object, Class<T> targetClass) {
        List<T> dataList = new ArrayList<>();
        try {
            if (object instanceof QuerySnapshot) {
                QuerySnapshot querySnapshot = (QuerySnapshot) object;
                for (DocumentSnapshot snapshot : querySnapshot.getDocuments()) {
                    T dataObject = snapshot.toObject(targetClass);

//                    // Assuming targetClass has a field named "disabled" (modify condition as needed)
//                    if (dataObject != null && !(dataObject instanceof RadioProgram) || (dataObject instanceof RadioProgram && !((RadioProgram) dataObject).disabled())) {
//                        dataList.add(dataObject);
//                    }else {
                    dataList.add(dataObject);
//                    }
                }
            }
            if (object instanceof DocumentSnapshot) {
                DocumentSnapshot documentSnapshot = (DocumentSnapshot) object;
                T dataObject = documentSnapshot.toObject(targetClass);
                dataList.add(dataObject);

            } else {
                // Handle unexpected object type (log error, throw exception, etc.)
                Log.e(TAG, "Unexpected object type: " + object.getClass().getName() + "\n object: "+object);
            }
        } catch (Exception e) {
            LogUtility.e(TAG, " getDataFromQuerySnapshot: ", e);
        }
        return dataList;
    }


}