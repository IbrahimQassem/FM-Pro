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
        //        DocumentReference pgRef =  collection("shards").document(String.valueOf(shardId));
//        DocumentReference pgRef = DATABASE.collection(RADIO_PROGRAM_TABLE).document(radioId).collection(RADIO_PROGRAM_TABLE).document(programId);
        return ref.update(field, FieldValue.increment(1));
    }

    public default Task<Void> decrementCounter(String field,DocumentReference ref ) {
        //        DocumentReference pgRef =  collection("shards").document(String.valueOf(shardId));
//        DocumentReference pgRef = DATABASE.collection(RADIO_PROGRAM_TABLE).document(radioId).collection(RADIO_PROGRAM_TABLE).document(programId);
        return ref.update(field, FieldValue.increment(-1));
    }

    public default Task<Void> rementCounter(String field, String radioId, String programId) {
        //        DocumentReference pgRef =  collection("shards").document(String.valueOf(shardId));
        DocumentReference pgRef = DATABASE.collection(RADIO_PROGRAM_TABLE).document(radioId).collection(RADIO_PROGRAM_TABLE).document(programId);
        return pgRef.update(field, FieldValue.increment(-1));
    }


    public default Task<Void> createCounter(final DocumentReference ref, final int numShards) {
        // Initialize the counter document, then initialize each shard.
        return ref.set(new Counter(numShards))
                .continueWithTask(new Continuation<Void, Task<Void>>() {
                    @Override
                    public Task<Void> then(@NonNull Task<Void> task) throws Exception {
                        if (!task.isSuccessful()) {
                            throw task.getException();
                        }

                        List<Task<Void>> tasks = new ArrayList<>();

                        // Initialize each shard with count=0
                        for (int i = 0; i < numShards; i++) {
                            Task<Void> makeShard = ref.collection("shards")
                                    .document(String.valueOf(i))
                                    .set(new Shard(0));

                            tasks.add(makeShard);
                        }

                        return Tasks.whenAll(tasks);
                    }
                });
    }



    public default Task<Integer> getCount(final DocumentReference ref) {
        // Sum the count of each shard in the subcollection
        return ref.collection("shards").get()
                .continueWith(new Continuation<QuerySnapshot, Integer>() {
                    @Override
                    public Integer then(@NonNull Task<QuerySnapshot> task) throws Exception {
                        int count = 0;
                        for (DocumentSnapshot snap : task.getResult()) {
                            Shard shard = snap.toObject(Shard.class);
                            count += shard.count;
                        }
                        return count;
                    }
                });
    }

    // counters/${ID}
    public class Counter {
        int numShards;

        public Counter(int numShards) {
            this.numShards = numShards;
        }
    }

    // counters/${ID}/shards/${NUM}
    public class Shard {
        int count;
        public Shard(int count) {
            this.count = count;
        }
    }
}
