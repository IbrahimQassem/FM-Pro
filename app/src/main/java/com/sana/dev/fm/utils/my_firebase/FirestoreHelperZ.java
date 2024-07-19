//package com.sana.dev.fm.utils.my_firebase;
//
//import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;
//
//import android.util.Log;
//
//import androidx.annotation.NonNull;
//
//import com.google.android.gms.tasks.OnCompleteListener;
//import com.google.android.gms.tasks.OnFailureListener;
//import com.google.android.gms.tasks.OnSuccessListener;
//import com.google.android.gms.tasks.Task;
//import com.google.firebase.firestore.CollectionReference;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.DocumentSnapshot;
//import com.google.firebase.firestore.FirebaseFirestore;
//import com.google.firebase.firestore.QuerySnapshot;
//import com.sana.dev.fm.model.RadioProgram;
//import com.sana.dev.fm.utils.LogUtility;
//
//import java.util.ArrayList;
//import java.util.List;
//import java.util.Map;
//
//public class FirestoreHelperZ {
//    private static final String TOP_LEVEL_COLLECTION = BASE_FB_DB;
//    private final FirebaseFirestore db = FirebaseFirestore.getInstance();
//
//    private CollectionReference getTopLevelCollection() {
//        return db.collection(TOP_LEVEL_COLLECTION);
//    }
//
//    //     Get a reference to a specific collection
////    private CollectionReference getCollectionReference(String collectionPath) {
////        String[] pathSegments = collectionPath.split("/");
////        CollectionReference collectionRef = getTopLevelCollection();
////        for (String segment : pathSegments) {
////            if (!segment.isEmpty()) {
////                collectionRef = collectionRef.document().collection(segment);
////            }
////        }
////        return collectionRef;
////    }
//
//    // Get a reference to a specific collection
//    private CollectionReference getCollectionReference(String collectionPath) {
//        String[] pathSegments = collectionPath.split("/");
//        CollectionReference collectionRef = getTopLevelCollection().document(collectionPath).collection(collectionPath);
////        for (String segment : pathSegments) {
////            if (!segment.isEmpty()) {
////                collectionRef = collectionRef.document(collectionPath).getId();
////            }
////        }
//        return collectionRef;
//    }
//
////    private Collection<RadioInfo> parentModules;
//
//
//    public DocumentReference getCollectionReferenceZ(String collectionPath) {
//        DocumentReference collectionRef = getTopLevelCollection().document(collectionPath);
////        CollectionReference collectionRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(collectionPath);
//        return collectionRef;
//    }
//
////    public  DocumentReference getDatabaseReferenceR(String collectionPath) {
////        DocumentReference myRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(collectionPath);
////        return myRef;
////    }
//
//
//    // Add a document to a specific collection with a generated ID
//    public void addDocument(String collectionPath, Map<String, Object> data, OnCompleteListener<DocumentReference> listener) {
//        getCollectionReference(collectionPath).add(data)
//                .addOnCompleteListener(listener);
//    }
//
//    // Add a document to a specific collection with a custom ID
//    public void addDocument(String collectionPath, String documentId, Map<String, Object> data, final CallBack callBack) {
//        getCollectionReference(collectionPath).document(documentId).set(data).addOnSuccessListener(new OnSuccessListener<Void>() {
//            @Override
//            public void onSuccess(Void aVoid) {
//                callBack.onSuccess(AppGeneralMessage.SUCCESS);
//            }
//        }).addOnFailureListener(new OnFailureListener() {
//            @Override
//            public void onFailure(@NonNull Exception e) {
//                callBack.onError(e);
//            }
//        });
//    }
//
//    public void addDocument(String collectionPath, String documentId, Object data, final CallBack callBack) {
//        getCollectionReference(collectionPath).document(documentId).set(data).addOnSuccessListener(new OnSuccessListener<Void>() {
//            @Override
//            public void onSuccess(Void aVoid) {
//                Log.d("FirestoreHelperZ", "onSuccess addDocument ");
//                callBack.onSuccess(AppGeneralMessage.SUCCESS);
//            }
//        }).addOnFailureListener(new OnFailureListener() {
//            @Override
//            public void onFailure(@NonNull Exception e) {
//                Log.w("FirestoreHelperZ", "Error addDocument", e);
//                callBack.onError(e);
//            }
//        });
//    }
//
//    public List<RadioProgram> getDataFromQuerySnapshot(Object object) {
//        List<RadioProgram> programList = new ArrayList<>();
//        try {
//            QuerySnapshot queryDocumentSnapshots = (QuerySnapshot) object;
//            for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
//                RadioProgram program = snapshot.toObject(RadioProgram.class);
//                if (!program.disabled())
//                    programList.add(program);
//            }
//        } catch (Exception e) {
//            LogUtility.e("FirestoreHelperZ", " getDataFromQuerySnapshot: " + object, e);
//        }
//        return programList;
//    }
//
//    // Get a document by its ID from a specific collection
//    public DocumentReference getDocument(String collectionPath, String documentId) {
//        return getCollectionReference(collectionPath).document(documentId);
//    }
//
//
//    // ... (You can add other helper methods for CRUD operations)
//
//    public void getAllDocuments(final String collectionPath, final CallBack callBack) {
//        getCollectionReference(collectionPath).get().addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
//            @Override
//            public void onComplete(@NonNull Task<QuerySnapshot> task) {
//                if (task.isSuccessful()) {
//                    QuerySnapshot querySnapshot = task.getResult();
//                    if (querySnapshot != null && !querySnapshot.isEmpty()) {
////                        Log.d("FirestoreHelperZ", "onSuccess getting documents" + new Gson().toJson(querySnapshot));
//                        callBack.onSuccess(getDataFromQuerySnapshot(querySnapshot));
//                    } else {
//                        callBack.onError(AppGeneralMessage.FAIL);
//                    }
//                } else {
//                    Log.w("FirestoreHelperZ", "Error getAllDocuments", task.getException());
//                    callBack.onError(task.getException());
//                }
//            }
//        });
//    }
//
//    // Example: Get all documents from a collection (using a query listener)
////    public void getAllDocuments(String collectionPath, final OnSnapshotListener<QuerySnapshot> listener) {
////        getCollectionReference(collectionPath)
////                .get()
////                .addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
////                    @Override
////                    public void onComplete(@NonNull Task<QuerySnapshot> task) {
////                        if (task.isSuccessful()) {
////                            listener.onSnapshot(task.getResult(), task.getException());
////                        } else {
////                            Log.w("FirestoreHelperZ", "Error getting documents", task.getException());
////                        }
////                    }
////                });
////    }
//
//    // Example: Update a document by ID
//    public void updateDocument(String collectionPath, String documentId, Map<String, Object> data, OnCompleteListener<Void> listener) {
//        getDocument(collectionPath, documentId).update(data)
//                .addOnCompleteListener(listener);
//    }
//
//    // Example: Delete a document by ID
//    public void deleteDocument(String collectionPath, String documentId, OnCompleteListener<Void> listener) {
//        getDocument(collectionPath, documentId).delete()
//                .addOnCompleteListener(listener);
//    }
//}
