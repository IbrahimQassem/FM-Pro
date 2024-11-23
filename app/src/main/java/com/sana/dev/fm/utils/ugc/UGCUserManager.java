//package com.sana.dev.fm.utils.ugc;
//
//import android.content.Context;
//import android.widget.Toast;
//
//import com.google.firebase.auth.FirebaseAuth;
//import com.google.firebase.auth.FirebaseUser;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.FieldValue;
//import com.google.firebase.firestore.FirebaseFirestore;
//import com.google.firebase.firestore.FirebaseFirestoreException;
//import com.google.firebase.firestore.SetOptions;
//import com.google.firebase.firestore.WriteBatch;
//import com.google.firestore.v1.DocumentTransform;
//import com.sana.dev.fm.model.Comment;
//import com.sana.dev.fm.model.UserBlock;
//
//import java.util.HashMap;
//import java.util.Map;
//
//public class UGCUserManager {
//    private final FirebaseFirestore db;
//    private final FirebaseAuth auth;
//    private final NetworkErrorHandler networkErrorHandler;
//    private final PendingOperationQueue pendingQueue;
//    private final CommentClickListener listener;
//    private final Context context;
//
//    private static final String COLLECTION_COMMENTS = "comments";
//    private static final String COLLECTION_LIKES = "likes";
//    private static final String COLLECTION_REPORTS = "reports";
//    private static final String COLLECTION_USER_BLOCKS = "userBlocks";
//
//    public UGCUserManager(Context context, CommentClickListener listener) {
//        this.context = context.getApplicationContext();
//        this.listener = listener;
//        this.db = FirebaseFirestore.getInstance();
//        this.auth = FirebaseAuth.getInstance();
//        this.networkErrorHandler = new NetworkErrorHandler(context);
//        this.pendingQueue = new PendingOperationQueue(context, networkErrorHandler);
//    }
//
//    public void handleCommentAction(Comment comment, CommentAction action) {
//        if (!isUserLoggedIn()) {
//            showAuthError();
//            return;
//        }
//
//        switch (action) {
//            case LIKE:
//                toggleLike(comment);
//                break;
//            case REPORT:
//                reportComment(comment);
//                break;
//            case DELETE:
//                deleteComment(comment);
//                break;
//            case BLOCK:
//                blockUser(comment);
//                break;
//            case UNBLOCK:
//                unblockUser(comment);
//                break;
//        }
//    }
//
//    private void toggleLike(Comment comment) {
//        String userId = getCurrentUserId();
//        DocumentReference likeRef = db.collection(COLLECTION_LIKES)
//                .document(userId + "_" + comment.getId());
//
////        networkErrorHandler.checkNetworkAndExecute(
////                () -> db.runTransaction(transaction -> {
////                            DocumentSnapshot likeSnapshot = transaction.get(likeRef);
////                            DocumentReference commentRef = db.collection(COLLECTION_COMMENTS)
////                                    .document(comment.getId());
////
////                            if (likeSnapshot.exists()) {
////                                // Unlike
////                                transaction.delete(likeRef);
////                                transaction.update(commentRef, "likeCount",
////                                        FieldValue.increment(-1));
//////                                comment.setLiked(false);
//////                                comment.setLikeCount(comment.getLikeCount() - 1);
////                            } else {
////                                // Like
////                                transaction.set(likeRef, new HashMap<String, Object>() {{
////                                    put("userId", userId);
////                                    put("commentId", comment.getId());
////                                    put("timestamp", System.currentTimeMillis());
////                                }});
////                                transaction.update(commentRef, "likeCount",
////                                        FieldValue.increment(1));
//////                                comment.setLiked(true);
//////                                comment.setLikeCount(comment.getLikeCount() + 1);
////                            }
////                            return null;
////                        })
////                        .addOnSuccessListener(aVoid -> {
////                            if (listener != null) {
////                                listener.onLikeClick(comment);
////                            }
////                        })
////                        .addOnFailureListener(this::handleFirebaseError)
////        );
//    }
//
//    private void reportComment(Comment comment) {
//        String userId = getCurrentUserId();
//        DocumentReference reportRef = db.collection(COLLECTION_REPORTS)
//                .document(userId + "_" + comment.getId());
//
//        Map<String, Object> report = new HashMap<String, Object>() {{
//            put("userId", userId);
//            put("commentId", comment.getId());
//            put("commentText", comment.getContent());
//            put("commentUserId", comment.getUserId());
//            put("timestamp", System.currentTimeMillis());
//            put("status", "PENDING");
//        }};
//
////        networkErrorHandler.checkNetworkAndExecute(
////                () -> reportRef.set(report)
////                        .addOnSuccessListener(aVoid -> {
////                            if (listener != null) {
////                                listener.onReportClick(comment);
////                            }
////                        })
////                        .addOnFailureListener(this::handleFirebaseError)
////        );
//    }
//
//    private void deleteComment(Comment comment) {
//        String userId = getCurrentUserId();
//        if (!canDeleteComment(comment, userId)) {
//            showError("You don't have permission to delete this comment");
//            return;
//        }
//
////        networkErrorHandler.checkNetworkAndExecute(
////                () -> db.runTransaction(transaction -> {
////                            DocumentReference commentRef = db.collection(COLLECTION_COMMENTS)
////                                    .document(comment.getId());
////
////                            // Delete comment
////                            transaction.delete(commentRef);
////
////                            // Delete associated likes
////                            db.collection(COLLECTION_LIKES)
////                                    .whereEqualTo("commentId", comment.getId())
////                                    .get()
////                                    .addOnSuccessListener(querySnapshot -> {
////                                        WriteBatch batch = db.batch();
////                                        for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
////                                            batch.delete(doc.getReference());
////                                        }
////                                        batch.commit();
////                                    });
////
////                            return null;
////                        })
////                        .addOnSuccessListener(aVoid -> {
////                            if (listener != null) {
////                                listener.onDeleteClick(comment);
////                            }
////                        })
////                        .addOnFailureListener(this::handleFirebaseError)
////        );
//    }
//
///*
//    private void blockUser(Comment comment) {
//        String userId = getCurrentUserId();
//        String targetUserId = comment.getUserId();
//
//        if (userId.equals(targetUserId)) {
//            showError("You cannot block yourself");
//            return;
//        }
//
//        DocumentReference blockRef = db.collection(COLLECTION_USER_BLOCKS)
//                .document(userId + "_" + targetUserId);
//
//        Map<String, Object> blockData = new HashMap<String, Object>() {{
//            put("blockedUserId", targetUserId);
//            put("blockedByUserId", userId);
//            put("timestamp", System.currentTimeMillis());
//            put("sourceCommentId", comment.getId());
//        }};
//
//        networkErrorHandler.checkNetworkAndExecute(
//                () -> blockRef.set(blockData)
//                        .addOnSuccessListener(aVoid -> {
//                            if (listener != null) {
//                                listener.onBlockClick(comment);
//                            }
//                        })
//                        .addOnFailureListener(this::handleFirebaseError)
//        );
//    }
//*/
//
//    private void blockUser(Comment comment) {
//        networkErrorHandler.checkNetworkAndExecute(
//                new NetworkOperation() {
//                    @Override
//                    public void execute(NetworkCallback networkCallback) {
//                        if (auth.getCurrentUser() == null) {
//                            networkCallback.onError(new NetworkError(NetworkErrorType.AUTHENTICATION_ERROR));
//                            return;
//                        }
//
//                        String userId = comment.getUserId();
//                        if (userId.equals(auth.getCurrentUser().getUid())) {
//                            networkCallback.onError(new NetworkError(NetworkErrorType.VALIDATION_ERROR));
//                            return;
//                        }
//
//                        UserBlock block = new UserBlock(
//                                userId,
//                                auth.getCurrentUser().getUid(),
//                                "Blocked from comment"
//                        );
//
//                        WriteBatch batch = db.batch();
//                        DocumentReference blockRef = db.collection("userBlocks")
//                                .document(auth.getCurrentUser().getUid() + "_" + userId);
//                        batch.set(blockRef, block);
//
//                        DocumentReference cacheRef = db.collection("blockCache")
//                                .document(auth.getCurrentUser().getUid());
//                        batch.set(cacheRef, new HashMap<String, Object>() {{
//                            Object ServerValue;
//                            put("lastUpdated", DocumentTransform.FieldTransform.ServerValue.REQUEST_TIME);
//                            put("blockedUsers", FieldValue.arrayUnion(userId));
//                        }}, SetOptions.merge());
//
//                        batch.commit()
//                                .addOnSuccessListener(aVoid -> {
//                                    networkCallback.onSuccess(null);
//                                    if (listener != null) {
//                                        listener.onBlockClick(comment);
//                                    }
//                                })
//                                .addOnFailureListener(e -> {
//                                    NetworkError error = mapFirebaseException(e);
//                                    networkCallback.onError(error);
//                                });
//                    }
//                },
//                new NetworkCallback() {
//                    @Override
//                    public void onSuccess(Object result) {
//                        // Success already handled in the batch commit listener
//                    }
//
//                    @Override
//                    public void onError(NetworkError error) {
////                        handleBlockOperationError(error, comment);
//                    }
//                }
//        );
//    }
//
//    private NetworkError mapFirebaseException(Exception e) {
//        if (e instanceof FirebaseFirestoreException) {
//            FirebaseFirestoreException ffe = (FirebaseFirestoreException) e;
//            switch (ffe.getCode()) {
//                case PERMISSION_DENIED:
//                    return new NetworkError(NetworkErrorType.AUTHENTICATION_ERROR);
//                case UNAVAILABLE:
//                    return new NetworkError(NetworkErrorType.SERVER_ERROR);
//                case DEADLINE_EXCEEDED:
//                    return new NetworkError(NetworkErrorType.TIMEOUT);
//                default:
//                    return new NetworkError(NetworkErrorType.UNKNOWN);
//            }
//        }
//        return new NetworkError(NetworkErrorType.UNKNOWN);
//    }
//
//
//
//    private void unblockUser(Comment comment) {
//        String userId = getCurrentUserId();
//        String targetUserId = comment.getUserId();
//
//        DocumentReference blockRef = db.collection(COLLECTION_USER_BLOCKS)
//                .document(userId + "_" + targetUserId);
//
////        networkErrorHandler.checkNetworkAndExecute(
////                () -> blockRef.delete()
////                        .addOnSuccessListener(aVoid -> {
////                            if (listener != null) {
////                                listener.onUnBlockClick(comment);
////                            }
////                        })
////                        .addOnFailureListener(this::handleFirebaseError)
////        );
//    }
//
//    public void navigateToUserProfile(String userId) {
//        if (listener != null) {
//            listener.onUserClick(userId);
//        }
//    }
//
//    private boolean canDeleteComment(Comment comment, String userId) {
//        return comment.getUserId().equals(userId) || isModeratorUser(userId);
//    }
//
//    private boolean isModeratorUser(String userId) {
//        // Implement your moderator checking logic here
//        return false;
//    }
//
//    private String getCurrentUserId() {
//        FirebaseUser user = auth.getCurrentUser();
//        return user != null ? user.getUid() : null;
//    }
//
//    private boolean isUserLoggedIn() {
//        return auth.getCurrentUser() != null;
//    }
//
//    private void showAuthError() {
//        showError("Please sign in to continue");
//    }
//
//    private void showError(String message) {
//        // Implement your error display logic here
//        Toast.makeText(context, message, Toast.LENGTH_SHORT).show();
//    }
//
//    private void handleFirebaseError(Exception e) {
//        if (e instanceof FirebaseFirestoreException) {
//            FirebaseFirestoreException firestoreException = (FirebaseFirestoreException) e;
//            switch (firestoreException.getCode()) {
//                case PERMISSION_DENIED:
//                    showError("You don't have permission to perform this action");
//                    break;
//                case UNAVAILABLE:
//                    showError("Service temporarily unavailable. Please try again later");
//                    break;
//                default:
//                    showError("An error occurred. Please try again");
//                    break;
//            }
//        } else {
//            showError("An unexpected error occurred");
//        }
//    }
//
//    public enum CommentAction {
//        LIKE,
//        REPORT,
//        DELETE,
//        BLOCK,
//        UNBLOCK
//    }
//}