package com.sana.dev.fm.utils.my_firebase.task;

import static com.sana.dev.fm.utils.LogUtility.TAG;

import android.util.Log;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.CallBack;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FirestoreCollectionTransferHelper {
    public static final FirebaseFirestore DATABASE = FirebaseFirestore.getInstance();
    private final FirestoreDbUtility firestoreDbUtility;
//    private final FirebaseFirestore sourceFirestore;
//    private final FirebaseFirestore destinationFirestore;
//
//    public FirestoreCollectionTransferHelper(FirebaseFirestore sourceFirestore, FirebaseFirestore destinationFirestore) {
//        this.sourceFirestore = sourceFirestore;
//        this.destinationFirestore = destinationFirestore;
//    }


    public FirestoreCollectionTransferHelper(FirestoreDbUtility firestoreDbUtility) {
        this.firestoreDbUtility = firestoreDbUtility;
    }

    public void transferCollection(CollectionReference sourceFirestore, CollectionReference destinationFirestore) {
        CollectionReference sourceCollection = sourceFirestore;
        CollectionReference destinationCollection = destinationFirestore;

        // Use a query to retrieve documents from the source collection in batches
        Query sourceQuery = sourceCollection; // .limit(10) Adjust batch size as needed
        while (sourceQuery != null) {
            // Get a batch of documents
            QuerySnapshot querySnapshot = sourceQuery.get().getResult();

            // Loop through each document in the batch
            for (DocumentSnapshot document : querySnapshot.getDocuments()) {
                String documentId = document.getId();
                Map<String, Object> data = document.getData();

                // Optionally transform data before insertion (if needed)
                // Map<String, Object> dataForDestination = prepareDataForDestination(data);

                // Insert the data into the destination collection
                destinationCollection.document(documentId).set(data).getResult();
            }

            // Update the query to get the next batch (if available)
            sourceQuery = sourceQuery.startAfter(querySnapshot.getDocumentChanges().get(querySnapshot.size() - 1).getDocument());
        }
    }

    public <T> List<T> processCollection(CollectionReference destinationFirestore, List<T> items) {

        // Do something with the list of episodes (cast if needed)
        for (T item : items) {
            // You might need to cast item to Episode for specific methods
            Object obj = (Object) item;
            // Access episode properties
            if (obj instanceof RadioInfo) {
                RadioInfo radioInfo = (RadioInfo) item;
                firestoreDbUtility.createOrMerge(destinationFirestore, radioInfo.getRadioId(), radioInfo, new CallBack() {
                    @Override
                    public void onSuccess(Object object) {

                    }

                    @Override
                    public void onFailure(Object object) {

                    }
                });
            }else if (obj instanceof RadioProgram) {
                RadioProgram radioProgram = (RadioProgram) item;
                firestoreDbUtility.createOrMerge(destinationFirestore, radioProgram.getProgramId(), radioProgram, new CallBack() {
                    @Override
                    public void onSuccess(Object object) {

                    }

                    @Override
                    public void onFailure(Object object) {

                    }
                });
            }else if (obj instanceof Episode) {
                Episode episode = (Episode) item;
                firestoreDbUtility.createOrMerge(destinationFirestore, episode.getEpId(), episode, new CallBack() {
                    @Override
                    public void onSuccess(Object object) {

                    }

                    @Override
                    public void onFailure(Object object) {

                    }
                });
            }
        }
        return items;
    }

    public class CollectionProcessor<T extends Object> {


    }

    // Optional method for data transformation before insertion (uncomment if needed)
    private Map<String, Object> prepareDataForDestination(Map<String, Object> data) {
        // Implement logic to transform data if necessary
        // Option 1: Renaming a field
        if (data.containsKey("oldFieldName")) {
            String newValue = (String) data.get("oldFieldName");
            data.put("newFieldName", newValue);
            data.remove("oldFieldName");
        }

        // Option 2: Removing a field
        if (data.containsKey("unneededField")) {
            data.remove("unneededField");
        }

        // Option 3: Filtering specific data types
        Map<String, Object> filteredData = new HashMap<>();
        for (Map.Entry<String, Object> entry : data.entrySet()) {
            if (entry.getValue() instanceof String || entry.getValue() instanceof Long || entry.getValue() instanceof Integer) {
                filteredData.put(entry.getKey(), entry.getValue());
            }
        }
        return filteredData;

        // You can add more logic here to handle other data transformation needs
    }

}
