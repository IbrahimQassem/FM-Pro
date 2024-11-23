package com.sana.dev.fm.utils.ugc;

import android.app.Activity;
import android.content.Context;
import android.widget.Toast;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.FirebaseFirestoreException;
import com.google.firebase.firestore.WriteBatch;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class UGCUserManager {
    private static final String COLLECTION_COMMENTS = "comments";
    private static final String COLLECTION_LIKES = "likes";
    //    private static final String COLLECTION_REPORTS = "reports";
    private static final String COLLECTION_USER_BLOCKS = "user_blocks";

    private final FirebaseFirestore db;
    private FirestoreDbUtility firestoreDbUtility;
    private final CommentClickListener listener;
    private final NetworkErrorHandler networkErrorHandler;
    private final Context context;
    private static final long OPERATION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
    private static final String COLLECTION_USER_ROLES = "user_roles";
    private static final String COLLECTION_MODERATOR_ACTIONS = "moderator_actions";
    private final Map<String, ModeratorStatus> moderatorCache = new ConcurrentHashMap<>();
    private final long MODERATOR_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes


    public UGCUserManager(Context context, CommentClickListener listener) {
        this.context = context;
        this.listener = listener;
        this.db = FirebaseFirestore.getInstance();
        this.firestoreDbUtility = new FirestoreDbUtility();
        this.networkErrorHandler = new NetworkErrorHandler(context);
    }


    private void executePendingLike(PendingOperationQueue.PendingOperation operation,
                                    NetworkCallback callback) {
        String userId = (String) operation.getData().get("userId");
        String commentId = operation.getCommentId();

        DocumentReference likeRef = db.collection(COLLECTION_LIKES)
                .document(userId + "_" + commentId);
        DocumentReference commentRef = db.collection(COLLECTION_COMMENTS)
                .document(commentId);

        db.runTransaction(transaction -> {
                    DocumentSnapshot commentSnapshot = transaction.get(commentRef);
                    DocumentSnapshot likeSnapshot = transaction.get(likeRef);

                    if (!commentSnapshot.exists()) {
                        throw new FirebaseFirestoreException("Comment not found",
                                FirebaseFirestoreException.Code.NOT_FOUND);
                    }

                    if (!likeSnapshot.exists()) {
                        Long currentLikes = commentSnapshot.getLong("likeCount");
                        if (currentLikes == null) currentLikes = 0L;

                        Map<String, Object> likeData = new HashMap<>();
                        likeData.put("userId", userId);
                        likeData.put("commentId", commentId);
                        likeData.put("timestamp", System.currentTimeMillis());
                        transaction.set(likeRef, likeData);
                        transaction.update(commentRef, "likeCount", currentLikes + 1);
                    }
                    return null;
                })
                .addOnSuccessListener(aVoid -> callback.onSuccess(null))
                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
    }


    public void handleCommentAction(Comment comment, CommentAction action, String radioId, NetworkCallback networkCallback) {
        switch (action) {
            case LIKE:
                toggleLike(comment, radioId, networkCallback);
                break;
            case REPORT:
                reportComment(comment, radioId, networkCallback);
                break;
            case DELETE:
                deleteComment(comment, radioId, networkCallback);
                break;
            case BLOCK:
                blockUser(comment, radioId, networkCallback);
                break;
            case UNBLOCK:
                unblockUser(comment, radioId, networkCallback);
                break;
            case USER_PROFILE:
                if (networkCallback != null) {
                    networkCallback.onSuccess(comment.getUserId());
                }
                break;
        }
    }

    private String getCurrentUserId() {
        FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        if (user == null) {
            throw new IllegalStateException("User must be logged in");
        }
        return user.getUid();
    }

    private void toggleLike(Comment comment, String radioId, NetworkCallback networkCallback) {
        String userId = getCurrentUserId();

//        DocumentReference commentRef = db.collection(COLLECTION_COMMENTS).document(comment.getCommentId());

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference colRef = collectionReference.document(comment.getEpisodeId())
                .collection(AppConstant.Firebase.COMMENT_TABLE);
//        String pushKey = radioId + "_" + userId + "_" + comment.getCommentId();
        DocumentReference likeRef = colRef.document(comment.getCommentId());
//        DocumentReference commentRef = colRef.document(comment.getCommentId());


        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                       /* db.runTransaction(transaction -> {
                                    DocumentSnapshot likeSnapshot = transaction.get(likeRef);
                                    DocumentSnapshot commentSnapshot = transaction.get(commentRef);

                                    if (!commentSnapshot.exists()) {
                                        throw new FirebaseFirestoreException("Comment not found",
                                                FirebaseFirestoreException.Code.NOT_FOUND);
                                    }

                                    if (likeSnapshot.exists()) {
                                        Long currentLikes = commentSnapshot.getLong("likeCount");
                                        if (currentLikes == null) currentLikes = 0L;

                                        transaction.update(commentRef, "likeCount",
                                                Math.max(0, currentLikes - 1));
                                        transaction.delete(likeRef);

//                                        comment.setLiked(false);
//                                        comment.setLikeCount(Math.max(0, comment.getLikeCount() - 1));
                                    } else {
                                        Long currentLikes = commentSnapshot.getLong("likeCount");
                                        if (currentLikes == null) currentLikes = 0L;

                                        Map<String, Object> likeData = new HashMap<>();
                                        likeData.put("userId", userId);
                                        likeData.put("commentId", comment.getCommentId());
                                        likeData.put("timestamp", System.currentTimeMillis());

                                        transaction.set(likeRef, likeData);
                                        transaction.update(commentRef, "likeCount", currentLikes + 1);

//                                        comment.setLiked(true);
//                                        comment.setLikeCount(comment.getLikeCount() + 1);
                                    }
                                    return null;
                                })
                                .addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
                                    if (listener != null) {
                                        listener.onLikeClick(comment);
                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                   */

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
                                }).addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
//                                    if (listener != null) {
//                                        listener.onLikeClick(comment);
//                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                    }
                }
        );
    }


    private void reportComment(Comment comment, String radioId, NetworkCallback networkCallback) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.REPORTS_TABLE);
        String pushKey = radioId + "_" + userId + "_" + comment.getCommentId();
        DocumentReference reportRef = collectionReference.document(pushKey);

        Map<String, Object> report = new HashMap<>();
        report.put("userId", userId);
        report.put("commentId", comment.getCommentId());
        report.put("commentText", comment.getContent());
        report.put("commentUserId", comment.getUserId());
        report.put("timestamp", System.currentTimeMillis());
        report.put("status", "PENDING");
        report.put("deviceInfo", Tools.getDeviceInfoName());
        report.put("appVersion", Tools.getAppVersion(context));

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        // First check if already reported
//                        if (comment.getReportedBy().contains(userId)) {
//                            callback.onError(new NetworkError(NetworkErrorType.ALREADY_REPORTED));
//                            return null;
//                        } else
                        if (userId.equals(targetUserId)) {
                            callback.onError(new NetworkError(NetworkErrorType.SELF_REPORTED));
                            return;
                        }
                        reportRef.get().addOnSuccessListener(documentSnapshot -> {
                            if (documentSnapshot.exists()) {
                                callback.onError(new NetworkError(NetworkErrorType.ALREADY_REPORTED));
                                return;
                            }

                            Comment updatedComment = comment;

                            updatedComment.getReportedBy().add(userId);
                            updatedComment.setReportCount(updatedComment.getReportCount() + 1);
                            updatedComment.setDeviceInfo(Tools.getDeviceInfoName());
                            updatedComment.setAppVersion(Tools.getAppVersion(context));
                            // Auto-hide comment if report threshold reached
//                            if (updatedComment.getReportCount() >= 5) {
                                updatedComment.setReviewed(true);
                                // Move to moderation queue
                                CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.MODERATION_TABLE);
                                String pushKey = radioId + "_" + userId + "_" + comment.getCommentId();
                                DocumentReference reportRef = collectionReference.document(pushKey);
                                reportRef.set(updatedComment);
//                            }

                            reportRef.set(report)
                                    .addOnSuccessListener(aVoid -> {
                                        callback.onSuccess(null);
                                        networkCallback.onSuccess(null);
//                                        if (listener != null) {
//                                            listener.onReportClick(comment);
//                                        }
                                    })
                                    .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                        });
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        networkCallback.onSuccess(null);
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                        networkCallback.onError(error);
                    }
                }
        );
    }

    private void deleteComment(Comment comment, String radioId, NetworkCallback networkCallback) {
        String userId = getCurrentUserId();
        if (!canDeleteComment(comment, userId)) {
            showError(context.getString(R.string.msg_you_don_t_have_permission_to_delete_this_comment));
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference colRef = collectionReference
                .document(comment.getEpisodeId())
                .collection(AppConstant.Firebase.COMMENT_TABLE);

        DocumentReference commentRef = colRef.document(comment.getCommentId());

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        db.collection(COLLECTION_LIKES)
                                .whereEqualTo("commentId", comment.getCommentId())
                                .get()
                                .addOnSuccessListener(querySnapshot -> {
                                    WriteBatch batch = db.batch();

                                    for (DocumentSnapshot doc : querySnapshot.getDocuments()) {
                                        batch.delete(doc.getReference());
                                    }

                                    batch.delete(commentRef);

                                    batch.commit()
                                            .addOnSuccessListener(aVoid -> {
                                                callback.onSuccess(null);
//                                                if (listener != null) {
//                                                    listener.onDeleteClick(comment);
//                                                }
                                            })
                                            .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        networkCallback.onSuccess(result);
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                        networkCallback.onError(error);
                    }
                }
        );
    }

    private void blockUser(Comment comment, String radioId, NetworkCallback networkCallback) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();

        if (userId.equals(targetUserId)) {
            showError(context.getString(R.string.msg_you_cannot_block_yourself));
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.COLLECTION_USER_BLOCKS);
        String pushKey = /*radioId + "_" + */userId + "_" + targetUserId;
        DocumentReference blockRef = collectionReference.document(pushKey);

        Map<String, Object> blockData = new HashMap<>();
        blockData.put("blockedUserId", targetUserId);
        blockData.put("blockedByUserId", userId);
        blockData.put("timestamp", System.currentTimeMillis());
        blockData.put("sourceCommentId", comment.getCommentId());
        blockData.put("reason", comment.getContent());
        blockData.put("status", "active");

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        blockRef.set(blockData)
                                .addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
//                                    if (listener != null) {
//                                        listener.onBlockClick(comment);
//                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        networkCallback.onSuccess(null);
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                        networkCallback.onError(error);
                    }
                }
        );
    }

    private void unblockUser(Comment comment, String radioId, NetworkCallback networkCallback) {
        String userId = getCurrentUserId();
        String targetUserId = comment.getUserId();


        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.COLLECTION_USER_BLOCKS);
        String pushKey = /*radioId + "_" +*/ userId + "_" + targetUserId;
        DocumentReference blockRef = collectionReference.document(pushKey);

        networkErrorHandler.checkNetworkAndExecute(
                new NetworkOperation() {
                    @Override
                    public void execute(NetworkCallback callback) {
                        blockRef.delete()
                                .addOnSuccessListener(aVoid -> {
                                    callback.onSuccess(null);
//                                    if (listener != null) {
//                                        listener.onUnBlockClick(comment);
//                                    }
                                })
                                .addOnFailureListener(e -> callback.onError(mapFirebaseException(e)));
                    }
                },
                new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        networkCallback.onSuccess(result);
                    }

                    @Override
                    public void onError(NetworkError error) {
                        handleNetworkError(error);
                        networkCallback.onError(error);
                    }
                }
        );
    }

    private boolean canDeleteComment(Comment comment, String userId) {
        return comment.getUserId().equals(userId) || isModeratorUser(userId);
    }

    private boolean isModeratorUser(String userId) {
        // Implement your moderator checking logic here
        return false;
    }

    private NetworkError mapFirebaseException(Exception e) {
        if (e instanceof FirebaseFirestoreException) {
            FirebaseFirestoreException firestoreException = (FirebaseFirestoreException) e;
            switch (firestoreException.getCode()) {
                case PERMISSION_DENIED:
                    return new NetworkError(NetworkErrorType.PERMISSION_DENIED);
                case UNAVAILABLE:
                    return new NetworkError(NetworkErrorType.SERVER_ERROR);
                case NOT_FOUND:
                    return new NetworkError(NetworkErrorType.NOT_FOUND);
                case ALREADY_EXISTS:
                    return new NetworkError(NetworkErrorType.ALREADY_EXISTS);
                default:
                    return new NetworkError(NetworkErrorType.UNKNOWN);
            }
        }
        return new NetworkError(NetworkErrorType.UNKNOWN);
    }

    private void handleNetworkError(NetworkError error) {
        String errorMessage;
        switch (error.getType()) {
            case NO_CONNECTIVITY:
                errorMessage = context.getString(R.string.msg_no_internet_connection);
                break;
            case PERMISSION_DENIED:
                errorMessage = context.getString(R.string.msg_you_don_t_have_permission_to_perform_this_action);
                break;
            case SERVER_ERROR:
                errorMessage = context.getString(R.string.msg_server_error_please_try_again_later);
                break;
            case NOT_FOUND:
                errorMessage = context.getString(R.string.msg_content_not_found);
                break;
            case ALREADY_EXISTS:
                errorMessage = context.getString(R.string.msg_already_performed_this_action);
                break;
            case ALREADY_REPORTED:
                errorMessage = context.getString(R.string.msg_you_have_already_reported_this_comment);
                break;
            case SELF_REPORTED:
                errorMessage = context.getString(R.string.msg_you_cannot_report_yourself);
                break;
            default:
                errorMessage = context.getString(R.string.msg_an_unexpected_error_occurred);
                break;
        }
        showError(errorMessage);
    }

    private void showError(String message) {
        if (context instanceof Activity) {
            ((Activity) context).runOnUiThread(() ->
                    Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
        }
    }


}