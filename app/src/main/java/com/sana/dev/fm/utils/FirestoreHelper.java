//package com.sana.dev.fm.utils;
//
//import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;
//
//import android.util.Log;
//
//import androidx.annotation.NonNull;
//
//import com.google.android.gms.tasks.OnCompleteListener;
//import com.google.android.gms.tasks.Task;
//import com.google.firebase.firestore.CollectionReference;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.FirebaseFirestore;
//import com.google.firebase.firestore.QuerySnapshot;
//import com.sana.dev.fm.utils.my_firebase.AppGeneralMessage;
//import com.sana.dev.fm.utils.my_firebase.CallBack;
//
//import java.util.Map;
//
//public class FirestoreHelper {
//    private static final String TOP_LEVEL_COLLECTION = BASE_FB_DB;
//
//    private final FirebaseFirestore db;
//
//    public FirestoreHelper() {
//        db = FirebaseFirestore.getInstance();
//    }
//
//    // Add a document to a specific collection with a generated ID
//    public Task<DocumentReference> addDocument(String collectionPath, Map<String, Object> data) {
//        return getCollectionReference(collectionPath).add(data);
//    }
//
//    // Add a document to a specific collection with a custom ID
//    public Task<Void> addDocument(String collectionPath, String documentId, Map<String, Object> data) {
//        return getCollectionReference(collectionPath).document(documentId).set(data);
//    }
//
//    // Get a document by its ID from a specific collection
//    public DocumentReference getDocument(String collectionPath, String documentId) {
//        return getCollectionReference(collectionPath).document(documentId);
//    }
//
//    // Get a reference to a specific collection
//    private CollectionReference getCollectionReference(String collectionPath) {
//        String[] pathSegments = collectionPath.split("/");
////        CollectionReference collectionRef = db.collection(TOP_LEVEL_COLLECTION).document(collectionPath).collection(collectionPath);
//        CollectionReference collectionRef = db.collection(TOP_LEVEL_COLLECTION);
//        for (String segment : pathSegments) {
//            if (!segment.isEmpty()) {
//                collectionRef = collectionRef.document(collectionPath).collection(segment);
//            }
//        }
//        return collectionRef;
//    }
//
//
//    // Get all documents from a collection (using a query listener)
//    public void getAllDocuments(String collectionPath, final CallBack listener) {
//        getCollectionReference(collectionPath)
//                .get()
//                .addOnCompleteListener(task -> {
//                    if (task.isSuccessful()) {
////                            listener.onSnapshot(task.getResult(), task.getException());
//                        listener.onSuccess(task);
//                    } else {
//                        Log.w("FirestoreHelper", "Error getting documents", task.getException());
//                    }
//                });
//    }
//
//    // Update a document by ID
//    public Task<Void> updateDocument(String collectionPath, String documentId, Map<String, Object> data) {
//        return getDocument(collectionPath, documentId).update(data);
//    }
//
//    // Delete a document by ID
//    public Task<Void> deleteDocument(String collectionPath, String documentId) {
//        return getDocument(collectionPath, documentId).delete();
//    }
//
//    // Helper method for handling subcollections (optional)
//    public CollectionReference getSubcollectionReference(String collectionPath, String subcollectionPath) {
////        return getCollectionReference(collectionPath).collection(subcollectionPath);
//        return getCollectionReference(collectionPath);
//    }
//
//
//}
