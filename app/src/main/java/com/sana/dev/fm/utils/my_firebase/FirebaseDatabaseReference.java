package com.sana.dev.fm.utils.my_firebase;



import static com.sana.dev.fm.BuildConfig.BASE_FB_DB;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FirebaseFirestore;

public class FirebaseDatabaseReference {
//    private DocumentReference documentReference;

    private FirebaseDatabaseReference() {
    }
    public static final FirebaseFirestore DATABASE = FirebaseFirestore.getInstance();

//    public static final CollectionReference DATABASE_REF = FirebaseFirestore.getInstance().collection(BASE_FB_DB);


//    public static DocumentReference getDocumentReference(String path) {
//        return DATABASE_REF.document(path);
//    }
}