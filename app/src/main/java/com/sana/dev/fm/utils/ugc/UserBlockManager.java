package com.sana.dev.fm.utils.ugc;

import android.content.Context;
import android.widget.Toast;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.firestore.WriteBatch;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.model.UserBlock;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.HashSet;
import java.util.Set;

public class UserBlockManager {
    private static UserBlockManager instance;
    private final FirebaseFirestore db;
    private final FirebaseAuth auth;
    private FirestoreDbUtility firestoreDbUtility;
    private NetworkErrorHandler networkErrorHandler;
    private PendingOperationQueue pendingQueue;
    private CommentClickListener listener;
    private Context context;
    private final Set<String> blockedUsers;
    private CommentClickListener commentClickListener;
    private ListenerRegistration blockListener;
    private static final String COLLECTION_LIKES = "likes";
    private static final String COLLECTION_REPORTS = "reports";
    private static final String COLLECTION_USER_BLOCKS = "userBlocks";

//    private UserBlockManager() {
//        db = FirebaseFirestore.getInstance();
//        auth = FirebaseAuth.getInstance();
//        blockedUsers = new HashSet<>();
//        setupBlockListener();
//    }

    private UserBlockManager(Context context, CommentClickListener listener) {
        this.context = context.getApplicationContext();
        this.listener = listener;
        this.db = FirebaseFirestore.getInstance();
        this.auth = FirebaseAuth.getInstance();
        this.firestoreDbUtility = new FirestoreDbUtility();
        this.networkErrorHandler = new NetworkErrorHandler(context);
        this.pendingQueue = new PendingOperationQueue(context, networkErrorHandler);
        blockedUsers = new HashSet<>();
        setupBlockListener();
    }

    public static synchronized UserBlockManager getInstance(Context context, CommentClickListener listener) {
        if (instance == null) {
            instance = new UserBlockManager(context, listener);
        }
        return instance;
    }

    private void setupBlockListener() {
        if (auth.getCurrentUser() == null) return;

        if (blockListener != null) {
            blockListener.remove();
        }

//        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.ALERT_TABLE);
//        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
//                .collection(AppConstant.Firebase.COLLECTION_USER_BLOCKS);
//
//        blockListener = colRef
//                .whereEqualTo("blockedByUserId", auth.getCurrentUser().getUid())
//                .addSnapshotListener((value, error) -> {
//                    if (error != null || value == null) return;
//
//                    blockedUsers.clear();
//                    for (DocumentSnapshot doc : value.getDocuments()) {
//                        UserBlock block = doc.toObject(UserBlock.class);
//                        if (block != null) {
//                            blockedUsers.add(block.getBlockedUserId());
//                        }
//                    }
//                });
    }

    public void handleCommentAction(Comment comment, CommentAction action, String radioId) {
        if (!isUserLoggedIn()) {
            showAuthError();
            return;
        }

        switch (action) {
            case LIKE:
                toggleLike(comment, radioId);
                break;
            case REPORT:
                reportComment(comment, radioId);
                break;
            case DELETE:
                deleteComment(comment, radioId);
                break;
            case BLOCK:
                blockUser(comment);
                break;
            case UNBLOCK:
                unblockUser(comment);
                break;
        }
    }

    private void toggleLike(Comment comment, String radioId) {
        String userId = getCurrentUserId();

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
                .collection(AppConstant.Firebase.COMMENT_TABLE);

//        DocumentReference likeRef = colRef.document(comment.getId());
        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
                        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
                                .collection(AppConstant.Firebase.COMMENT_TABLE);
                        DocumentReference likeRef = colRef.document(comment.getId());

                        db.runTransaction(transaction -> {
                            DocumentSnapshot snapshot = transaction.get(likeRef);
                            Comment updatedComment = snapshot.toObject(Comment.class);

                            if (updatedComment.getLikedBy().contains(userId)) {
                                updatedComment.getLikedBy().remove(userId);
                            } else {
                                updatedComment.getLikedBy().add(userId);
                            }

                            transaction.set(likeRef, updatedComment);
                            return null;
                        }).addOnFailureListener(e -> showError("Failed to update like"));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        // Success already handled in the transaction listener
                        LogUtility.d(LogUtility.TAG, "success set  : " + comment.getId() + " res is  : " + result);
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }

    private void reportComment(Comment comment, String radioId) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();
        if (userId.equals(targetUserId)) {
            showError("You cannot report yourself");
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference collRef = collectionReference
                .document(comment.getEpisodeId())
                .collection(AppConstant.Firebase.COMMENT_TABLE);

        DocumentReference commentRef = collRef.document(comment.getId());

//        Map<String, Object> report = new HashMap<String, Object>() {{
//            put("userId", userId);
//            put("commentId", comment.getId());
//            put("commentText", comment.getContent());
//            put("commentUserId", comment.getUserId());
//            put("timestamp", System.currentTimeMillis());
//            put("status", "PENDING");
//        }};

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
//                        reportRef.set(report)
//                                .addOnSuccessListener(aVoid -> {
//                                    callback.onSuccess(null);
//                                    if (listener != null) {
//                                        listener.onReportClick(comment);
//                                    }
//                                })
//                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));

                        db.runTransaction(transaction -> {
                                    DocumentSnapshot snapshot = transaction.get(commentRef);
                                    Comment updatedComment = snapshot.toObject(Comment.class);

                                    updatedComment.getReportedBy().add(userId);
                                    updatedComment.setReportCount(updatedComment.getReportCount() + 1);

                                    // Auto-hide comment if report threshold reached
                                    if (updatedComment.getReportCount() >= 5) {
                                        updatedComment.setReviewed(true);
                                        // Move to moderation queue
                                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.ALERT_TABLE);
                                        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
                                                .collection(AppConstant.Firebase.MODERATION_TABLE);
                                        colRef.document(comment.getId())
                                                .set(updatedComment);
                                    }

                                    transaction.set(commentRef, updatedComment);
                                    return null;
                                }).addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
                                    if (listener != null) {
                                        listener.onReportClick(comment);
                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        // Success already handled in the operation
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }

    private void deleteComment(Comment comment, String radioId) {
        String userId = getCurrentUserId();
        if (!canDeleteComment(comment, userId)) {
            showError("You don't have permission to delete this comment");
            return;
        }

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        db.runTransaction(transaction -> {
                                    CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
                                    CollectionReference colRef = collectionReference
                                            .document(comment.getEpisodeId())
                                            .collection(AppConstant.Firebase.COMMENT_TABLE);

                                    DocumentReference commentRef = colRef.document(comment.getId());

                                    // Delete comment
                                    transaction.delete(commentRef);

//                                    // Delete associated likes
//                                    db.collection(COLLECTION_LIKES)
//                                            .whereEqualTo("commentId", comment.getId())
//                                            .get()
//                                            .addOnSuccessListener(querySnapshot -> {
//                                                WriteBatch batch = db.batch();
//                                                for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
//                                                    batch.delete(doc.getReference());
//                                                }
//                                                batch.commit();
//                                            });

                                    return null;
                                })
                                .addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
                                    if (listener != null) {
                                        listener.onDeleteClick(comment);
                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        // Success already handled in the transaction listener
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }

    public void blockUser(Comment comment) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();

        if (userId.equals(targetUserId)) {
            showError("You cannot block yourself");
            return;
        }

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback networkCallback) {
                        if (auth.getCurrentUser() == null) {
                            networkCallback.onError(new NetworkError(NetworkErrorType.AUTHENTICATION_ERROR));
                            return;
                        }

                        if (userId.equals(targetUserId)) {
                            networkCallback.onError(new NetworkError(NetworkErrorType.VALIDATION_ERROR));
                            return;
                        }


                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.COLLECTION_USER_BLOCKS);
//                        String pushKey = collectionReference.document().getId();
                        String pushKey = comment.getEpisodeId() + "_" + userId + "_" + targetUserId;
//                        String pushKey = comment.getEpisodeId();
//                        CollectionReference colRef = collectionReference.document(pushKey);

                        UserBlock block = new UserBlock(pushKey, userId, targetUserId, comment.getContent());
//                        DocumentReference blockRef = colRef.document(userId + "_" + targetUserId);

                        WriteBatch batch = db.batch();
                        DocumentReference blockRef = collectionReference.document(pushKey);
                        batch.set(blockRef, block);

                        // Also update local cache
//                        DocumentReference cacheRef = db.collection("blockCache")
//                                .document(auth.getCurrentUser().getUid());
//                        batch.set(cacheRef, new HashMap<String, Object>() {{
//                            put("lastUpdated", System.currentTimeMillis());
//                            put("blockedUsers", FieldValue.arrayUnion(userId));
//                        }}, SetOptions.merge());

                        batch.commit()
                                .addOnSuccessListener(aVoid -> {
                                    blockedUsers.add(userId);
                                    networkCallback.onSuccess(null);
                                })
                                .addOnFailureListener(e -> {
                                    NetworkError error = mapFirebaseException(e);
                                    networkCallback.onError(error);
                                });
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
//                        callback.onSuccess();
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }

    private void unblockUser(Comment comment) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.ALERT_TABLE);
        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
                .collection(AppConstant.Firebase.COLLECTION_USER_BLOCKS);

        DocumentReference blockRef = colRef.document(userId + "_" + targetUserId);

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        blockRef.delete()
                                .addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
                                    if (listener != null) {
                                        listener.onUnBlockClick(comment);
                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        // Success already handled in the operation
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }

    private NetworkError mapFirebaseException(Exception e) {
        if (e instanceof FirebaseFirestoreException) {
            FirebaseFirestoreException firestoreException = (FirebaseFirestoreException) e;
            switch (firestoreException.getCode()) {
                case PERMISSION_DENIED:
                    return new NetworkError(NetworkErrorType.PERMISSION_DENIED);
                case UNAVAILABLE:
                    return new NetworkError(NetworkErrorType.SERVER_ERROR);
                default:
                    return new NetworkError(NetworkErrorType.UNKNOWN);
            }
        }
        return new NetworkError(NetworkErrorType.UNKNOWN);
    }

    private void handleNetworkError(NetworkError error) {
        switch (error.getType()) {
            case NO_CONNECTIVITY:
                showError("No internet connection");
                break;
            case PERMISSION_DENIED:
                showError("You don't have permission to perform this action");
                break;
            case SERVER_ERROR:
                showError("Server error. Please try again later");
                break;
            default:
                showError("An unexpected error occurred");
                break;
        }
    }

    public void cleanup() {
        if (blockListener != null) {
            blockListener.remove();
        }
    }

    public void navigateToUserProfile(String userId) {
        if (listener != null) {
            listener.onUserClick(userId);
        }
    }

    private boolean canDeleteComment(Comment comment, String userId) {
        return comment.getUserId().equals(userId) || isModeratorUser(userId);
    }

    private boolean isModeratorUser(String userId) {
        // Implement your moderator checking logic here
        return false;
    }

    private String getCurrentUserId() {
        FirebaseUser user = auth.getCurrentUser();
        return user != null ? user.getUid() : null;
    }

    private boolean isUserLoggedIn() {
        return auth.getCurrentUser() != null;
    }

    private void showAuthError() {
        showError("Please sign in to continue");
    }

    private void showError(String message) {
        // Implement your error display logic here
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
    }

    public boolean isUserBlocked(String userId) {
        return blockedUsers.contains(userId);
    }

    private void handleFirebaseError(Exception e) {
        if (e instanceof FirebaseFirestoreException) {
            FirebaseFirestoreException firestoreException = (FirebaseFirestoreException) e;
            switch (firestoreException.getCode()) {
                case PERMISSION_DENIED:
                    showError("You don't have permission to perform this action");
                    break;
                case UNAVAILABLE:
                    showError("Service temporarily unavailable. Please try again later");
                    break;
                default:
                    showError("An error occurred. Please try again");
                    break;
            }
        } else {
            showError("An unexpected error occurred");
        }
    }

}
/*
public class UserBlockManager {
    private final NetworkErrorHandler networkErrorHandler;
    private final FirebaseFirestore db;
    private final FirebaseAuth auth;
    private final Set<String> blockedUsers;
    private ListenerRegistration blockListener;
    private static final int OFFLINE_CACHE_EXPIRY_HOURS = 24;

    public UserBlockManager(Context context) {
        this.networkErrorHandler = new NetworkErrorHandler(context);
        this.db = FirebaseFirestore.getInstance();
        this.auth = FirebaseAuth.getInstance();
        this.blockedUsers = new HashSet<>();
        setupBlockListener();
//        setupOfflineCapabilities();
    }

    private void setupOfflineCapabilities() {
        FirebaseFirestoreSettings settings = new FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .setCacheSizeBytes(FirebaseFirestoreSettings.CACHE_SIZE_UNLIMITED)
                .build();
        db.setFirestoreSettings(settings);
    }

    public void blockUser(String userId, String reason, BlockOperationCallback callback) {
        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback networkCallback) {
                        if (auth.getCurrentUser() == null) {
                            networkCallback.onError(new NetworkError(NetworkErrorType.AUTHENTICATION_ERROR));
                            return;
                        }

                        if (userId.equals(auth.getCurrentUser().getUid())) {
                            networkCallback.onError(new NetworkError(NetworkErrorType.VALIDATION_ERROR));
                            return;
                        }

                        UserBlock block = new UserBlock(userId, auth.getCurrentUser().getUid(), reason);

                        WriteBatch batch = db.batch();
                        DocumentReference blockRef = db.collection("userBlocks")
                                .document(auth.getCurrentUser().getUid() + "_" + userId);
                        batch.set(blockRef, block);

                        // Also update local cache
                        DocumentReference cacheRef = db.collection("blockCache")
                                .document(auth.getCurrentUser().getUid());
                        batch.set(cacheRef, new HashMap<String, Object>() {{
                            put("lastUpdated", DocumentTransform.FieldTransform.ServerValue.REQUEST_TIME);
                            put("blockedUsers", FieldValue.arrayUnion(userId));
                        }}, SetOptions.merge());

                        batch.commit()
                                .addOnSuccessListener(aVoid -> {
                                    blockedUsers.add(userId);
                                    networkCallback.onSuccess(null);
                                })
                                .addOnFailureListener(e -> {
                                    NetworkError error = mapFirebaseException(e);
                                    networkCallback.onError(error);
                                });
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        callback.onSuccess();
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleBlockOperationError(error, callback);
                    }
                }
        );
    }

    public void unblockUser(String userId, OnBlockCompleteListener listener) {
        if (auth.getCurrentUser() == null) {
            listener.onFailure(new Exception("User not authenticated"));
            return;
        }

        db.collection("userBlocks")
                .document(auth.getCurrentUser().getUid() + "_" + userId)
                .delete()
                .addOnSuccessListener(aVoid -> {
                    blockedUsers.remove(userId);
                    listener.onSuccess();
                })
                .addOnFailureListener(listener::onFailure);
    }

    public boolean isUserBlocked(String userId) {
        return blockedUsers.contains(userId);
    }

    public void getBlockedUsers(OnBlockedUsersLoadedListener listener) {
        if (auth.getCurrentUser() == null) {
            listener.onFailure(new Exception("User not authenticated"));
            return;
        }

        db.collection("userBlocks")
                .whereEqualTo("blockedByUserId", auth.getCurrentUser().getUid())
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    List<UserBlock> blocks = new ArrayList<>();
                    for (DocumentSnapshot doc : queryDocumentSnapshots) {
                        UserBlock block = doc.toObject(UserBlock.class);
                        if (block != null) {
                            blocks.add(block);
                        }
                    }
                    listener.onSuccess(blocks);
                })
                .addOnFailureListener(listener::onFailure);
    }

    public void cleanup() {
        if (blockListener != null) {
            blockListener.remove();
        }
    }

    public interface OnBlockCompleteListener {
        void onSuccess();
        void onFailure(Exception e);
    }

    public interface OnBlockedUsersLoadedListener {
        void onSuccess(List<UserBlock> blockedUsers);
        void onFailure(Exception e);
    }

    private void handleBlockOperationError(NetworkError error, BlockOperationCallback callback) {
        switch (error.getType()) {
            case NO_CONNECTIVITY:
                // Store operation in pending queue for later sync
                storePendingOperation(error, callback);
                break;
            case AUTHENTICATION_ERROR:
                callback.onError("Please sign in to continue");
                break;
            case VALIDATION_ERROR:
                callback.onError("Invalid operation");
                break;
            case SERVER_ERROR:
                callback.onError("Server error. Please try again later");
                break;
            default:
                callback.onError("An unexpected error occurred");
                break;
        }
    }

    private void storePendingOperation(NetworkError error, BlockOperationCallback callback) {
//        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(context);
        // Store pending operation for later sync
        // Implement your offline storage logic here

        callback.onError("Operation stored for later. Will be completed when connection is restored");
    }

    private NetworkError mapFirebaseException(Exception e) {
        if (e instanceof FirebaseFirestoreException) {
            FirebaseFirestoreException ffe = (FirebaseFirestoreException) e;
            switch (ffe.getCode()) {
                case PERMISSION_DENIED:
                    return new NetworkError(NetworkErrorType.AUTHENTICATION_ERROR);
                case UNAVAILABLE:
                    return new NetworkError(NetworkErrorType.SERVER_ERROR);
                case DEADLINE_EXCEEDED:
                    return new NetworkError(NetworkErrorType.TIMEOUT);
                default:
                    return new NetworkError(NetworkErrorType.UNKNOWN);
            }
        }
        return new NetworkError(NetworkErrorType.UNKNOWN);
    }

    private void setupBlockListener() {
        if (auth.getCurrentUser() == null) return;

        if (blockListener != null) {
            blockListener.remove();
        }

        blockListener = db.collection("userBlocks")
                .whereEqualTo("blockedByUserId", auth.getCurrentUser().getUid())
                .addSnapshotListener((value, error) -> {
                    if (error != null) {
                        NetworkError networkError = mapFirebaseException(error);
                        handleListenerError(networkError);
                        return;
                    }

                    if (value != null) {
//                        updateBlockedUsersList(value);
                    }
                });
    }

    private void handleListenerError(NetworkError error) {
        if (error.getType() == NetworkErrorType.NO_CONNECTIVITY) {
            // Load from local cache
            loadFromLocalCache();
        }
    }

    private void loadFromLocalCache() {
        db.collection("blockCache")
                .document(auth.getCurrentUser().getUid())
                .get(Source.CACHE)
                .addOnSuccessListener(document -> {
                    if (document.exists()) {
                        Timestamp lastUpdated = document.getTimestamp("lastUpdated");
                        if (isCacheValid(lastUpdated)) {
                            List<String> cachedBlockedUsers = (List<String>) document.get("blockedUsers");
                            if (cachedBlockedUsers != null) {
                                blockedUsers.clear();
                                blockedUsers.addAll(cachedBlockedUsers);
                            }
                        }
                    }
                });
    }

    private boolean isCacheValid(Timestamp lastUpdated) {
        if (lastUpdated == null) return false;
        long hoursSinceUpdate = 0;
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            hoursSinceUpdate = ChronoUnit.HOURS.between(
                    lastUpdated.toDate().toInstant(),
                    Instant.now()
            );
        }
        return hoursSinceUpdate < OFFLINE_CACHE_EXPIRY_HOURS;
    }

    public interface BlockOperationCallback {
        void onSuccess();
        void onError(String message);
    }
}*/
