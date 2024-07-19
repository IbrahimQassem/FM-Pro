//package com.sana.dev.fm.utils.my_firebase;
//
//
//
//import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;
//
//import com.google.android.gms.tasks.OnCompleteListener;
//import com.google.firebase.firestore.CollectionReference;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.FirebaseFirestore;
//
//import java.util.Map;
//
//public class FirebaseDatabaseReference {
////    private DocumentReference documentReference;
//
//    private FirebaseDatabaseReference() {
//    }
////    public static final FirebaseFirestore DATABASE = FirebaseFirestore.getInstance();
//
////    public static final CollectionReference DATABASE_REF = FirebaseFirestore.getInstance().collection(BASE_FB_DB);
//
//
////    public static DocumentReference getDocumentReference(String path) {
////        return DATABASE_REF.document(path);
////    }
//private static final String TOP_LEVEL_COLLECTION = "BASE_FB_DB";
//    private static final FirebaseFirestore db = FirebaseFirestore.getInstance();
//
//    // Get a reference to the top-level collection
//    public static CollectionReference getTopLevelCollection() {
//        return db.collection(TOP_LEVEL_COLLECTION);
//    }
//
//    // Add a document to the top-level collection with a generated ID
//    public void addDocument(Map<String, Object> data, OnCompleteListener<DocumentReference> listener) {
//        getTopLevelCollection().add(data)
//                .addOnCompleteListener(listener);
//    }
//
//    // Add a document to the top-level collection with a custom ID
//    public void addDocument(String documentId, Map<String, Object> data, OnCompleteListener<Void> listener) {
//        getTopLevelCollection().document(documentId).set(data)
//                .addOnCompleteListener(listener);
//    }
//
//    // Get a subcollection reference within the top-level collection
//    public CollectionReference getSubcollection(String subcollectionName) {
//        return getTopLevelCollection().document(subcollectionName).collection(subcollectionName);
//    }
//
//}