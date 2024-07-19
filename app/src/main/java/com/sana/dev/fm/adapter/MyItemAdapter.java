package com.sana.dev.fm.adapter;

import android.view.ViewGroup;

import androidx.annotation.NonNull;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.sana.dev.fm.model.Episode;

public class MyItemAdapter extends FirestoreRecyclerAdapter<Episode, ChatHolder> {

    public MyItemAdapter(Query query, FirestoreRecyclerOptions options) {
        super(options);
    }


    @NonNull
    @Override
    public ChatHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return null;
    }


    @Override
    protected void onBindViewHolder(@NonNull ChatHolder holder, int position, @NonNull Episode model) {
        Episode item = getItem(position);
        // Bind data to view holder
    }

//    @Override
//    protected Query onCreateQuery() {
//        return FirebaseFirestore.getInstance().collection("yourCollectionName")
//                .whereEqualTo("disabled", false); // Filter for non-disabled items (optional)
//    }
}
