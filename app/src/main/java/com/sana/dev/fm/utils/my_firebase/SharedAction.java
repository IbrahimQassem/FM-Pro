package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.FieldValue;
import com.sana.dev.fm.utils.AppConstant;


public interface SharedAction {

    public default Task<Void> incrementCounter(String field,DocumentReference ref ) {
        return ref.update(field, FieldValue.increment(1));
    }

    public default Task<Void> decrementCounter(String field,DocumentReference ref ) {
        return ref.update(field, FieldValue.increment(-1));
    }

    public default Task<Void> rementCounter(String field, String radioId, String programId) {
        DocumentReference pgRef = DATABASE.collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE).document(radioId).collection(AppConstant.Firebase.RADIO_PROGRAM_TABLE).document(programId);
        return pgRef.update(field, FieldValue.increment(-1));
    }
}
