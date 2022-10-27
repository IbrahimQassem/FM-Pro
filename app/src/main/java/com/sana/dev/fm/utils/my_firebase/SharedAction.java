package com.sana.dev.fm.utils.my_firebase;

import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.RADIO_PROGRAM_TABLE;
import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.Continuation;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.QuerySnapshot;

import java.util.ArrayList;
import java.util.List;


public interface SharedAction {

    public default Task<Void> incrementCounter(String field,DocumentReference ref ) {
        return ref.update(field, FieldValue.increment(1));
    }

    public default Task<Void> decrementCounter(String field,DocumentReference ref ) {
        return ref.update(field, FieldValue.increment(-1));
    }

    public default Task<Void> rementCounter(String field, String radioId, String programId) {
        DocumentReference pgRef = DATABASE.collection(RADIO_PROGRAM_TABLE).document(radioId).collection(RADIO_PROGRAM_TABLE).document(programId);
        return pgRef.update(field, FieldValue.increment(-1));
    }
}
