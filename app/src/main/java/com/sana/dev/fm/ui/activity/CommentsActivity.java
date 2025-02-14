package com.sana.dev.fm.ui.activity;


import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.AnimationUtils;
import android.view.animation.DecelerateInterpolator;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.Transaction;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.CommentsAdapter;
import com.sana.dev.fm.databinding.ActivityCommentsBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.ui.view.SendCommentButton;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.IntentHelper;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.ugc.CommentAction;
import com.sana.dev.fm.utils.ugc.CommentClickListener;
import com.sana.dev.fm.utils.ugc.NetworkCallback;
import com.sana.dev.fm.utils.ugc.NetworkError;
import com.sana.dev.fm.utils.ugc.UGCUserManager;

import java.util.HashMap;
import java.util.Map;

/**
 * Created by ibrahim
 */
public class CommentsActivity extends BaseActivity implements SendCommentButton.OnSendClickListener, CommentClickListener {
    public static final String ARG_DRAWING_START_LOCATION = "arg_drawing_start_location";
    public final String TAG = CommentsActivity.class.getSimpleName();

    private ActivityCommentsBinding binding;
    private String radioId, epId;
    private Query query;
    private UserModel currentUser;
    private PreferencesManager prefMgr;
    private CommentsAdapter commentsAdapter;
    private int drawingStartLocation;
    private FirestoreDbUtility firestoreDbUtility;
    private FirebaseFirestore db;
//    private UserBlockManager blockManager;
    private UGCUserManager ugcManager;


    public static void startActivity(Context context, Episode episode) {
        Intent intent = new Intent(context, CommentsActivity.class);
        String obj = (new Gson().toJson(episode));
        intent.putExtra("episode", obj);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_comments);

        binding = ActivityCommentsBinding.inflate(getLayoutInflater());
        View view = binding.getRoot();
        setContentView(view);

        prefMgr = PreferencesManager.getInstance();
        firestoreDbUtility = new FirestoreDbUtility();
        db = FirebaseFirestore.getInstance();
//        this.blockManager = new UserBlockManager(this, this);
        this.ugcManager = new UGCUserManager(this, this);


        initToolbar();
        loadComments();
        setupSendCommentButton();

        drawingStartLocation = getIntent().getIntExtra(ARG_DRAWING_START_LOCATION, 0);
        if (savedInstanceState == null) {
            binding.contentRoot.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
                @Override
                public boolean onPreDraw() {
                    binding.contentRoot.getViewTreeObserver().removeOnPreDrawListener(this);
                    startIntroAnimation();
                    return true;
                }
            });
        }
    }

    private void initToolbar() {
        binding.toolbar.imbEvent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
    }

    private void loadComments() {

        String s = getIntent().getStringExtra("episode");
        if (s == null) {
            showSnackBar(getString(R.string.label_error_occurred));
            return;
        }

        Episode episode = new Gson().fromJson(s, Episode.class);
        radioId = episode.getRadioId();
        epId = episode.getEpId();

        if (prefMgr.getUserSession() == null) {
            binding.etComment.setHint(getString(R.string.add_comment));
//            currentUser.setUserId(prefMgr.get);
        } else {
            currentUser = prefMgr.getUserSession();
            binding.etComment.setHint(String.format(getString(R.string.label_comment_as), currentUser.getName()));
        }


        Tools.setTextOrHideIfEmpty(binding.toolbar.tvTitle, episode.getEpName());

//        getComments();


        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
        binding.rvComments.setLayoutManager(linearLayoutManager);
//        binding.rvComments.setHasFixedSize(true);
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        query = collectionReference
//                .document(radioId)
//                .collection(AppConstant.Firebase.EPISODE_TABLE)
                .document(epId)
                .collection(AppConstant.Firebase.COMMENT_TABLE)
                .orderBy("timestamp", Query.Direction.DESCENDING)/*.limit(COMMENT_LIMIT)*/;

//        Query query = notebookRef.orderBy("priority", Query.Direction.DESCENDING);
        FirestoreRecyclerOptions<Comment> options = new FirestoreRecyclerOptions.Builder<Comment>()
                .setQuery(query, Comment.class)
                .build();

        commentsAdapter = new CommentsAdapter(options, this, this, firestoreDbUtility, currentUser);
        commentsAdapter.registerAdapterDataObserver(new RecyclerView.AdapterDataObserver() {
            @Override
            public void onItemRangeInserted(int positionStart, int itemCount) {
                super.onItemRangeInserted(positionStart, itemCount);
                int friendlyMessageCount = commentsAdapter.getItemCount();
                int lastVisiblePosition = linearLayoutManager.findLastCompletelyVisibleItemPosition();
                // If the recycler view is initially being loaded or the
                // user is at the bottom of the list, scroll to the bottom
                // of the list to show the newly added message.
                if (lastVisiblePosition == -1 ||
                        (positionStart >= (friendlyMessageCount - 1) &&
                                lastVisiblePosition == (positionStart - 1))) {
                    binding.rvComments.scrollToPosition(positionStart);
                }

            }
        });
        binding.rvComments.setAdapter(commentsAdapter);
//        binding.rvComments.setOverScrollMode(View.OVER_SCROLL_NEVER);
//        binding.rvComments.setOnScrollListener(new RecyclerView.OnScrollListener() {
//            @Override
//            public void onScrollStateChanged(RecyclerView recyclerView, int newState) {
//                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
//                    commentsAdapter.setAnimationsLocked(true);
//                }
//            }
//        });
    }

    private void setupSendCommentButton() {
        binding.btnSendComment.setOnSendClickListener(this);
    }

    private void startIntroAnimation() {
//        ViewCompat.setElevation(getToolbar(), 0);
        binding.contentRoot.setScaleY(0.1f);
        binding.contentRoot.setPivotY(drawingStartLocation);
        binding.llAddComment.setTranslationY(200);

        binding.contentRoot.animate()
                .scaleY(1)
                .setDuration(200)
                .setInterpolator(new AccelerateInterpolator())
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
//                        ViewCompat.setElevation(getToolbar(), FmUtilize.dpToPx(8));
                        animateContent();
                    }
                })
                .start();
    }

    private void animateContent() {
        binding.llAddComment.animate().translationY(0)
                .setInterpolator(new DecelerateInterpolator())
                .setDuration(200)
                .start();
    }

    @Override
    public void onBackPressed() {
//        ViewCompat.setElevation(getToolbar(), 0);
        binding.contentRoot.animate()
                .translationY(FmUtilize.getScreenHeight(this))
                .setDuration(200)
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        CommentsActivity.super.onBackPressed();
                        overridePendingTransition(0, 0);
                    }
                })
                .start();
    }

    private void postComment() {
        if (validateComment()) {
//            commentsAdapter.addItem();
//            commentsAdapter.setAnimationsLocked(false);
//            commentsAdapter.setDelayEnterAnimation(false);
//            binding.rvComments.smoothScrollBy(0, binding.rvComments.getChildAt(0).getHeight() * commentsAdapter.getItemCount());

//            binding.etComment.setText(null);
//            binding.btnSendComment.setCurrentState(SendCommentButton.STATE_DONE);

            CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
            CollectionReference colRef = collectionReference.document(epId)
                    .collection(AppConstant.Firebase.COMMENT_TABLE);
//            String pushKey = colRef.document().getId();
            String pushKey = radioId + "_" + colRef.document().getId();
            String content = binding.etComment.getText().toString().trim();
            Comment comment = new Comment(
                    currentUser.getUserId(),
                    epId,
                    currentUser.getName(),
                    currentUser.getPhotoUrl() != null ? currentUser.getPhotoUrl().toString() : "",
                    content
            );
            comment.setCommentId(pushKey);
            comment.setDeviceInfo(Tools.getDeviceInfoName());
            comment.setAppVersion(Tools.getAppVersion(this));


            colRef.document(comment.getCommentId()).set(comment)
                    .addOnSuccessListener(aVoid -> {
                        binding.etComment.setText(null);
                        binding.btnSendComment.setCurrentState(SendCommentButton.STATE_DONE);
                        binding.etComment.setHint(getString(R.string.add_comment));
                        binding.etComment.setHint(String.format(getString(R.string.label_add_comment_as_val), currentUser.getName()));
                    }).addOnFailureListener(aVoid -> {
                        Log.e(TAG, "Error send commentModel ");
                        showToast(getString(R.string.label_error_occurred));
                    });


//            collectionReference.document(comment.getId()).set(comment).addOnSuccessListener(new OnSuccessListener<DocumentReference>() {
//                @Override
//                public void onSuccess(DocumentReference documentReference) {
//                    binding.etComment.setText(null);
//                    binding.btnSendComment.setCurrentState(SendCommentButton.STATE_DONE);
//                    binding.etComment.setHint(getString(R.string.add_comment));
//                    binding.etComment.setHint(String.format(getString(R.string.label_add_comment_as_val), currentUser.getName()));
//                }
//            }).addOnFailureListener(new OnFailureListener() {
//                @Override
//                public void onFailure(@NonNull Exception e) {
//                    e.printStackTrace();
//                    Log.e(TAG, "Error send commentModel " + e.getMessage());
//                }
//            });
        } else {
            binding.btnSendComment.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
        }

    }


    @Override
    public void onSendClickListener(View v) {
        postComment();
    }

    private boolean validateComment() {

        if (TextUtils.isEmpty(binding.etComment.getText())) {
//            AnimationUtil.shakeView(binding.etComment, CommentsActivity.this);
//            binding.btnSendComment.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
            showToast(getString(R.string.error_no_comment));
            return false;
        } else if (currentUser == null) {
            ModelConfig config = new ModelConfig(-1, getString(R.string.label_note), getString(R.string.goto_login), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_ok), new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intent = IntentHelper.intentFormSignUp(getApplicationContext(), false);
                    startActivity(intent);
                }
            }));
            showWarningDialog(config);
            return false;
        } else if (!hasInternetConnection()) {
//            showWarningDialog(-1,getString(R.string.label_no_internet), getString(R.string.check_internet_connection));
            showSnackBar(getString(R.string.check_internet_connection));
            return false;
        }
        return true;
    }

    @Override
    protected void onStart() {
        super.onStart();
        if (commentsAdapter != null)
            commentsAdapter.startListening();
    }

    @Override
    protected void onStop() {
        super.onStop();
        if (commentsAdapter != null)
            commentsAdapter.stopListening();
    }

    @Override
    public void onReportClick(Comment comment) {
        ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.lebel_report_comment), getString(R.string.confirm_report_comment), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_report), new View.OnClickListener() {
            @Override
            public void onClick(View v) {
//                reportComment(comment);
                comment.setEpisodeId(epId);
//                blockManager.handleCommentAction(comment, CommentAction.REPORT,radioId);
                ugcManager.handleCommentAction(comment, CommentAction.REPORT, radioId, new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        showToast(getString(R.string.done_successfully));
                    }

                    @Override
                    public void onError(NetworkError error) {
                      //  showToast(getString(R.string.label_error_occurred_with_val, error.getMessage()));
                    }
                });
            }
        }));
        showWarningDialog(config);
    }

    @Override
    public void onUserCommentClick(String userId) {
        postComment();
    }

    @Override
    public void onLikeClick(Comment comment) {
        comment.setEpisodeId(epId);
        ugcManager.handleCommentAction(comment, CommentAction.LIKE,radioId,null);
    }

    @Override
    public void onDeleteClick(Comment comment) {
        ModelConfig config = new ModelConfig(R.drawable.ic_warning, getString(R.string.lebel_delete_comment), getString(R.string.confirm_delete_comment), new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_delete), new View.OnClickListener() {
            @Override
            public void onClick(View v) {
//                deleteComment(comment);
                comment.setEpisodeId(epId);
                ugcManager.handleCommentAction(comment, CommentAction.DELETE, radioId, new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        showToast(getString(R.string.done_successfully));
                    }

                    @Override
                    public void onError(NetworkError error) {

                    }
                });
            }
        }));
        showWarningDialog(config);
    }

    @Override
    public void onBlockClick(Comment comment) {
//        ModelConfig config = new ModelConfig(R.drawable.ic_warning, "Block Comment", "Are you sure you want to delete this comment?", new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_confirm), new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                comment.setEpisodeId(epId);
//                ugcManager.handleCommentAction(comment, CommentAction.BLOCK, radioId, new NetworkCallback() {
//                    @Override
//                    public void onSuccess(Object result) {
//                        showToast(getString(R.string.done_successfully));
//                    }
//
//                    @Override
//                    public void onError(NetworkError error) {
//
//                    }
//                });
//            }
//        }));
//        //showWarningDialog(config);
//        if (blockManager.isUserBlocked(comment.getUserId())) {
//            showUnblockDialog(comment);
//        } else {

            View dialogView = getLayoutInflater().inflate(R.layout.dialog_block_user, null);
            EditText reasonInput = dialogView.findViewById(R.id.reason_input);

            new AlertDialog.Builder(this)
                    .setTitle(getString(R.string.label_block_user))
                    .setView(dialogView)
                    .setPositiveButton(getString(R.string.label_block), (dialog, which) -> {
                        if (!Tools.isEmpty(reasonInput)){
                            String reason = reasonInput.getText().toString().trim();
                            comment.setEpisodeId(epId);
                            comment.setContent(reason);

                            ugcManager.handleCommentAction(comment, CommentAction.BLOCK, radioId, new NetworkCallback() {
                                @Override
                                public void onSuccess(Object result) {
                                    showToast(getString(R.string.done_successfully));
                                    dialog.dismiss();
                                }

                                @Override
                                public void onError(NetworkError error) {

                                }
                            });
                        }

                    })
                    .setNegativeButton(getString(R.string.label_cancel), null)
                    .show();
//        }
    }

    @Override
    public void onUnBlockClick(Comment comment) {
        showUnblockDialog(comment);
    }

    @Override
    public void onUserClickProfile(String userId) {
        // Navigate to user profile
//        ModelConfig config = new ModelConfig(R.drawable.ic_warning, "Navigate to user profile", "Would you like to navigate to user profile?", new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_confirm), new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                Comment comment = new Comment();
//                comment.setCommentId(userId);
//                ugcManager.handleCommentAction(comment, CommentAction.USER_PROFILE, radioId, new NetworkCallback() {
//                    @Override
//                    public void onSuccess(Object result) {
//                        // Navigate to user profile
//                        Intent intent = IntentHelper.userProfileActivity(CommentsActivity.this, false);
//                        intent.putExtra("user_id", userId);
//                        startActivity(intent);                    }
//
//                    @Override
//                    public void onError(NetworkError error) {
//
//                    }
//                });
//            }
//        }));
//        showWarningDialog(config);
    }

    private void showUnblockDialog(Comment comment) {
        new AlertDialog.Builder(this)
                .setTitle(R.string.label_unblock_user)
                .setMessage(R.string.confirm_unblock_user)
                .setPositiveButton(R.string.label_unblock, (dialog, which) ->
                        ugcManager.handleCommentAction(comment, CommentAction.UNBLOCK,radioId,null)
                )
                .setNegativeButton(getString(R.string.label_cancel), null)
                .show();
    }


    private void reportComment(Comment comment) {
        String userId = currentUser.getUserId();

        // Check if user already reported
        if (comment.getReportedBy().contains(userId)) {
            showToast("You have already reported this comment");
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference colRef = collectionReference
                .document(epId)
                .collection(AppConstant.Firebase.COMMENT_TABLE);
        db.runTransaction((Transaction.Function<Void>) transaction -> {

            Comment updatedComment = comment;

            updatedComment.getReportedBy().add(userId);
            updatedComment.setReportCount(updatedComment.getReportCount() + 1);

            Map<String, Object> docData = new HashMap<>();
            docData.put("reportedBy", updatedComment.getReportedBy());
            docData.put("reportCount", updatedComment.getReportCount());

            LogUtility.i(LogUtility.TAG, "collectionReference is  : " + colRef.getParent());

            firestoreDbUtility.update(colRef, comment.getCommentId(), docData, new CallBack() {
                @Override
                public void onSuccess(Object object) {
//                    showToast(getString(R.string.done_successfully));
                    LogUtility.d(LogUtility.TAG, "success set  : " + comment.getCommentId() + " res is  : " + docData);
                    // Auto-hide comment if report threshold reached
                    if (updatedComment.getReportCount() >= 5) {
                        updatedComment.setReviewed(true);
                        // Move to moderation queue
                        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.ALERT_TABLE, AppConstant.Firebase.ALERT_TABLE);
                        CollectionReference colRef = collectionReference.document(epId)
                                .collection(AppConstant.Firebase.MODERATION_TABLE);
                        colRef.document(comment.getCommentId())
                                .set(updatedComment);
                        /*      firestoreDbUtility.createOrMerge(collectionReference, comment.getId(), updatedComment, new CallBack() {
                            @Override
                            public void onSuccess(Object object) {
//                                            showToast(getString(R.string.done_successfully));
                            }

                            @Override
                            public void onFailure(Object object) {
//                                            showToast(getString(R.string.label_error_occurred_with_val,object));
                            }
                        });*/
                    }
                }

                @Override
                public void onFailure(Object object) {
//                    showToast(getString(R.string.label_error_occurred_with_val, object));
                    LogUtility.e(LogUtility.TAG, "failure  : " + comment.getCommentId() + " res is  : " + object.toString());
                }
            });

            return null;
        }).addOnSuccessListener(aVoid -> {
            // Update local data
//            LogUtility.w(TAG, "FCM token updated successfully : " + object);
            showToast("Comment reported");
        }).addOnFailureListener(e -> {
            LogUtility.e(TAG, "onError : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getMessage()));
        });
    }

    private void deleteComment(Comment comment) {
        String userId = currentUser.getUserId();

        // Check if user already reported
        if (comment.getReportedBy().contains(userId)) {
            showToast("You have already reported this comment");
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
        CollectionReference colRef = collectionReference
                .document(epId)
                .collection(AppConstant.Firebase.COMMENT_TABLE);
        db.runTransaction((Transaction.Function<Void>) transaction -> {

            LogUtility.i(LogUtility.TAG, "collectionReference is  : " + colRef.getParent());

            firestoreDbUtility.deleteDocument(colRef, comment.getCommentId(), new CallBack() {
                @Override
                public void onSuccess(Object object) {
                    LogUtility.d(LogUtility.TAG, "success delete  : " + comment.getCommentId() + " res is  : " + object);
                    showToast(getString(R.string.deleted_successfully_with_param, comment.getContent()));
                }

                @Override
                public void onFailure(Object object) {
                    LogUtility.e(LogUtility.TAG, "failure  : " + comment.getCommentId() + " res is  : " + object.toString());
                    showToast(getString(R.string.error_failure));
                }
            });
            return null;
        }).addOnSuccessListener(aVoid -> {
            // Update local data
//            LogUtility.w(TAG, "FCM token updated successfully : " + object);
            showToast("Comment reported");
        }).addOnFailureListener(e -> {
            LogUtility.e(TAG, "onError : " + e.getMessage());
            showToast(getString(R.string.label_error_occurred_with_val, e.getMessage()));
        });
    }

    private void reportCommentZ(Comment comment) {
        String userId = currentUser.getUserId();

        // Check if user already reported
        if (comment.getReportedBy().contains(userId)) {
            showToast("You have already reported this comment");
            return;
        }

        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);

        CollectionReference colRef = collectionReference
                .document(epId)
                .collection(AppConstant.Firebase.COMMENT_TABLE);

        DocumentReference commentRef = colRef.document();
//        DocumentReference commentRef = db.collection("posts")
//                .document(postId)
//                .collection("comments")
//                .document(comment.getId());

        db.runTransaction(transaction -> {
            DocumentSnapshot snapshot = transaction.get(commentRef);
            Comment updatedComment = snapshot.toObject(Comment.class);

            updatedComment.getReportedBy().add(userId);
            updatedComment.setReportCount(updatedComment.getReportCount() + 1);

            // Auto-hide comment if report threshold reached
            if (updatedComment.getReportCount() >= 5) {
                updatedComment.setReviewed(true);
                // Move to moderation queue
                db.collection("moderation")
                        .document(comment.getCommentId())
                        .set(updatedComment);
            }

            transaction.set(commentRef, updatedComment);
            return null;
        }).addOnSuccessListener(result ->
                Toast.makeText(this, "Comment reported", Toast.LENGTH_SHORT).show()
        ).addOnFailureListener(e ->
                showToast("Failed to report comment")
        );
    }

}
