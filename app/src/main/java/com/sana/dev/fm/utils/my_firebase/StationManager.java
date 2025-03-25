package com.sana.dev.fm.utils.my_firebase;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FieldValue;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.firestore.Transaction;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.Arrays;
import java.util.Date;
import java.util.HashMap;
import java.util.List;

public class StationManager {
    public static final String TAG = StationManager.class.getSimpleName();
    private static final String _dateFormat = "yyyy-MM-dd"; // Get today's date (e.g., "2023-10-01")
    private static final String _timeFormat = "HH:mm:ss";//"HH:mm:ss";

    FirestoreDbUtility firestoreDbUtility = new FirestoreDbUtility();

    public StationManager() {
    }

    // Increment listener count and add listener ID for the current day
    public void addListener(String stationId, String listenerId) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat); // LocalDate.now().toString(); // Get today's date (e.g., "2023-10-01")
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            // Initialize if the document doesn't exist
            if (!snapshot.exists()) {
                transaction.set(dailyRef, new HashMap<String, Object>() {{
                    put("listener_count", 1);
                    put("total_listen_time", 0);
                    put("peak_time", "00:00");
                    put("peak_listener_count", 0);
                    put("listeners", Arrays.asList(listenerId)); // Add listener ID
                    put("favorites", Arrays.asList()); // Add listener ID
                    put("user_behavior", new HashMap<String, Integer>() {{
                        put("skips", 0);
                        put("favorites", 0);
                    }});
                }});
            } else {
                // Check if the listener ID already exists
                List<String> listeners = (List<String>) snapshot.get("listeners");
                if (listeners == null || !listeners.contains(listenerId)) {
                    // Add listener ID to the array
                    transaction.update(dailyRef, "listeners", FieldValue.arrayUnion(listenerId));

                    // Increment listener count
                    long listenerCount = snapshot.getLong("listener_count") + 1;
                    transaction.update(dailyRef, "listener_count", listenerCount);

                    // Update peak time if necessary
//                    String currentTime = FmUtilize.getTDateFormat(new Date(),_timeFormat); // Replace with actual time
//                    updatePeakTime(stationId, null, listenerCount);
                }
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
            LogUtility.d(TAG, "addListener:success");

        }).addOnFailureListener(e -> {
            // Handle error
            LogUtility.e(TAG, "failure: " + collectionReference.getParent() + " " + dailyRef);
            LogUtility.e(TAG, "Error failure in addListener " + e.getMessage());
        });
    }

    // Increment listener count for the current day
    /*public void incrementListenerCount(String stationId) {
        String today = FmUtilize.getTDateFormat(new Date(),_dateFormat); // LocalDate.now().toString(); // Get today's date (e.g., "2023-10-01")
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            // Initialize if the document doesn't exist
            if (!snapshot.exists()) {
                transaction.set(dailyRef, new HashMap<String, Object>() {{
                    put("listener_count", 1);
                    put("total_listen_time", 0);
                    put("peak_time", "00:00");
                    put("peak_listener_count", 0);
                    put("user_behavior", new HashMap<String, Integer>() {{
                        put("skips", 0);
                        put("favorites", 0);
                    }});
                }});
            } else {
                // Increment listener count
                long listenerCount = snapshot.getLong("listener_count") + 1;
                transaction.update(dailyRef, "listener_count", listenerCount);

                // Update peak time if necessary
                String currentTime = FmUtilize.getTDateFormat(new Date(),_timeFormat); // Replace with actual time
                updatePeakTime(stationId, currentTime, listenerCount);
//                updatePeakTime(stationId, currentTime, listenerCount, transaction);
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
            LogUtility.d(TAG, "incrementListenerCount:success");

        }).addOnFailureListener(e -> {
            // Handle error
            LogUtility.e(TAG, "failure: " + collectionReference.getParent() + " " + dailyRef);
            LogUtility.e(TAG, "Error failure in incrementListenerCount " + e.getMessage());
        });
    }*/

    // Increment skips for the current day
    public void incrementSkips(String stationId, String listenerId) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat);
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            if (snapshot.exists()) {
                // Update total skips
                long skips = snapshot.getLong("user_behavior.skips") + 1;
                transaction.update(dailyRef, "user_behavior.skips", skips);

                // Optionally, track skips per user
                DocumentReference listenerRef = dailyRef.collection("skips_users").document(listenerId);
                transaction.set(listenerRef, new HashMap<String, Object>() {{
                    put("skips", FieldValue.increment(1));
                }}, SetOptions.merge());
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
        }).addOnFailureListener(e -> {
            // Handle error
        });
    }

    // Increment favorites for the current day
    public void incrementFavorites(String stationId, String userId) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat);
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            if (snapshot.exists()) {
                // Update total favorites
                long favorites = snapshot.getLong("user_behavior.favorites") + 1;
                transaction.update(dailyRef, "user_behavior.favorites", favorites);

                // Update individual favorites for the userId
                DocumentReference listenerRef = dailyRef.collection("favorite_users").document(userId);
                transaction.update(dailyRef, "favorites", FieldValue.arrayUnion(userId));

                transaction.set(listenerRef, new HashMap<String, Object>() {{
                    put("favorites", FieldValue.increment(1));
                }}, SetOptions.merge());
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
            LogUtility.d(TAG, "incrementFavorites:success");

        }).addOnFailureListener(e -> {
            // Handle error
            LogUtility.e(TAG, "failure: " + collectionReference.getParent() + " " + dailyRef);
            LogUtility.e(TAG, "Error failure in incrementFavorites " + e.getMessage());
        });
    }

/*    // Update peak time for the current day
    private void updatePeakTime(String stationId, String currentTime, long currentListenerCount) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat);
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            if (snapshot.exists()) {
//                String peakTime = snapshot.getString("peak_time");
                String peakTime = FmUtilize.getTDateFormat(new Date(), _timeFormat); // Replace with actual time

                // Compare with previous peak time
                if (currentListenerCount > snapshot.getLong("peak_listener_count")) {
                    transaction.update(dailyRef, "peak_time", peakTime);
                    transaction.update(dailyRef, "peak_listener_count", currentListenerCount);
                }
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
            LogUtility.d(TAG, "updatePeakTime:success");

        }).addOnFailureListener(e -> {
            // Handle error
            LogUtility.e(TAG, "failure: " + collectionReference.getParent() + " " + dailyRef);
            LogUtility.e(TAG, "Error failure in updatePeakTime " + e.getMessage());
        });
    }*/

    // Update listen time for the current day
    public void updateListenTime(String stationId, String listenerId, long listenDuration) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat);
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        firestoreDbUtility.getFireDb().runTransaction((Transaction.Function<Void>) transaction -> {
            DocumentSnapshot snapshot = transaction.get(dailyRef);

            if (snapshot.exists()) {
                // Update total listen time
                long totalListenTime = snapshot.getLong("total_listen_time") + listenDuration;
                transaction.update(dailyRef, "total_listen_time", totalListenTime);

                // Optionally, track individual listen time per user
                DocumentReference listenerRef = dailyRef.collection("listeners").document(listenerId);
                transaction.set(listenerRef, new HashMap<String, Object>() {{
                    put("listen_time", listenDuration);
                }}, SetOptions.merge());

                // Increment listener count
                long currentListenerCount = snapshot.getLong("listener_count") + 1;
                transaction.update(dailyRef, "listener_count", currentListenerCount);
                // Compare with previous peak time
                if (currentListenerCount > snapshot.getLong("peak_listener_count")) {
                    String peakTime = FmUtilize.getTDateFormat(new Date(), _timeFormat); // Replace with actual time
                    transaction.update(dailyRef, "peak_time", peakTime);
                    transaction.update(dailyRef, "peak_listener_count", currentListenerCount);
                }
            }

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Success
            LogUtility.d(TAG, "updateListenTime:success");

        }).addOnFailureListener(e -> {
            // Handle error
            LogUtility.e(TAG, "failure: " + collectionReference.getParent() + " " + dailyRef);
            LogUtility.e(TAG, "Error failure in updateListenTime " + e.getMessage());
        });
    }


    // Get real-time updates for listener count
    public void listenToListenerCount(String stationId, ListenerCountCallback callback) {
        String today = FmUtilize.getTDateFormat(new Date(), _dateFormat);
        CollectionReference collectionReference = firestoreDbUtility.getTopLevelCollection().document(AppConstant.Firebase.RADIO_INFO_TABLE).collection(AppConstant.Firebase.RADIO_INFO_TABLE);
        DocumentReference dailyRef = collectionReference
                .document(stationId)
                .collection(AppConstant.Firebase.COLLECTION_DAILY_LISTENERS)
                .document(today);

        dailyRef.addSnapshotListener((snapshot, e) -> {
            if (e != null) {
                callback.onError(e);
                return;
            }

            if (snapshot != null && snapshot.exists()) {
                long listenerCount = snapshot.getLong("listener_count");
                callback.onListenerCountUpdated(listenerCount);
            }
        });
    }

    public void recommendStations() {
        firestoreDbUtility.getFireDb().collection("stations")
                .orderBy("overall_stats.total_listener_count", Query.Direction.DESCENDING)
                .limit(5)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    for (DocumentSnapshot snapshot : queryDocumentSnapshots) {
                        String stationName = snapshot.getString("station_name");
                        // Display recommended stations
                    }
                })
                .addOnFailureListener(e -> {
                    // Handle error
                });
    }

    // Callback interface for real-time updates
    public interface ListenerCountCallback {
        void onListenerCountUpdated(long listenerCount);

        void onError(Exception e);
    }
}
