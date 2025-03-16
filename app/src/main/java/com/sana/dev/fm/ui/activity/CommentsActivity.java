package com.sana.dev.fm.ui.activity;


import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Parcelable;
import android.text.Editable;
import android.text.TextUtils;
import android.text.TextWatcher;
import android.util.Log;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.AnimationUtils;
import android.view.animation.DecelerateInterpolator;
import android.widget.EditText;

import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.Query;
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
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;
import com.sana.dev.fm.utils.ugc.CommentAction;
import com.sana.dev.fm.utils.ugc.CommentClickListener;
import com.sana.dev.fm.utils.ugc.NetworkCallback;
import com.sana.dev.fm.utils.ugc.NetworkError;
import com.sana.dev.fm.utils.ugc.UGCUserManager;

import java.util.concurrent.TimeUnit;

/**
 * Created by ibrahim
 */
public class CommentsActivity extends BaseActivity implements SendCommentButton.OnSendClickListener, CommentClickListener {
    public static final String ARG_DRAWING_START_LOCATION = "arg_drawing_start_location";
    public final String TAG = CommentsActivity.class.getSimpleName();

    private ActivityCommentsBinding binding;
    private View networkStatusIndicator;
    // Define max comment length
    private final int maxCommentLength = 500; // Set your desired limit
    private String radioId, epId;
    private Query query;
    private UserModel currentUser;
    private PreferencesManager prefMgr;
    private CommentsAdapter commentsAdapter;
    private int drawingStartLocation;
    private FirestoreDbUtility firestoreDbUtility;
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

        this.ugcManager = new UGCUserManager(this, this);
        // Initialize network status indicator
        networkStatusIndicator = binding.networkStatusIndicator;

        initToolbar();
        initEvent();
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

    private void initEvent() {

// Add TextWatcher to EditText
        binding.etComment.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
                // Called before the text is changed
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
//                // Called when the text is being changed
//                int currentLength = s.length();
//                binding.charCounter.setText(currentLength + "/" + maxCommentLength);
//
//                // Optional: Change text color if the limit is exceeded
//                if (currentLength > maxCommentLength) {
//                    binding.charCounter.setTextColor(ContextCompat.getColor(CommentsActivity.this, R.color.red_500));
//                } else {
//                    binding.charCounter.setTextColor(ContextCompat.getColor(CommentsActivity.this, R.color.grey_500));
//                }
                String trimmedText = s.toString().trim();
                int currentLength = trimmedText.length();
                binding.charCounter.setText(currentLength + "/" + maxCommentLength);

                // Disable submit button if limit is exceeded
                binding.btnSendComment.setEnabled(currentLength <= maxCommentLength);

                // Change text color if limit is exceeded
                if (currentLength > maxCommentLength) {
                    binding.charCounter.setTextColor(ContextCompat.getColor(CommentsActivity.this, R.color.red_500));
                } else {
                    binding.charCounter.setTextColor(ContextCompat.getColor(CommentsActivity.this, R.color.grey_500));
                }
            }

            @Override
            public void afterTextChanged(Editable s) {
                // Called after the text has been changed
            }
        });
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
        try {
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
            } else {
                currentUser = prefMgr.getUserSession();
                binding.etComment.setHint(String.format(getString(R.string.label_comment_as), currentUser.getName()));
            }


            Tools.setTextOrHideIfEmpty(binding.toolbar.tvTitle, episode.getEpName());

            // Initialize LinearLayoutManager
            LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
            linearLayoutManager.setItemPrefetchEnabled(false); // Disable predictive animations
            binding.rvComments.setLayoutManager(linearLayoutManager);

            // Set fixed size (optional)
            binding.rvComments.setHasFixedSize(true);


//            LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
//            binding.rvComments.setLayoutManager(linearLayoutManager);
//        binding.rvComments.setHasFixedSize(true);
            CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
            query = collectionReference
//                .document(radioId)
//                .collection(AppConstant.Firebase.EPISODE_TABLE)
                    .document(epId)
                    .collection(AppConstant.Firebase.COMMENT_TABLE)
                    .orderBy("timestamp", Query.Direction.DESCENDING)/*.limit(COMMENT_LIMIT)*/;

            FirestoreRecyclerOptions<Comment> options = new FirestoreRecyclerOptions.Builder<Comment>()
                    .setQuery(query, Comment.class)
                    .build();

            commentsAdapter = new CommentsAdapter(options, this, this, currentUser);
//             Simplified data observer
            commentsAdapter.registerAdapterDataObserver(new RecyclerView.AdapterDataObserver() {
                @Override
                public void onItemRangeInserted(int positionStart, int itemCount) {
                    super.onItemRangeInserted(positionStart, itemCount);
                    binding.rvComments.smoothScrollToPosition(positionStart);
                }
            });


            // Set Adapter
            binding.rvComments.setAdapter(commentsAdapter);

            // Debugging
            Log.d(TAG, "RecyclerViewDebug LayoutManager: " + binding.rvComments.getLayoutManager());
            Log.d(TAG, "RecyclerViewDebug Adapter: " + binding.rvComments.getAdapter());
            Log.d(TAG, "RecyclerViewDebug ItemCount: " + binding.rvComments.getAdapter().getItemCount());

/*            commentsAdapter.registerAdapterDataObserver(new RecyclerView.AdapterDataObserver() {
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
            });*/
//        binding.rvComments.setOverScrollMode(View.OVER_SCROLL_NEVER);
//        binding.rvComments.setOnScrollListener(new RecyclerView.OnScrollListener() {
//            @Override
//            public void onScrollStateChanged(RecyclerView recyclerView, int newState) {
//                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
//                    commentsAdapter.setAnimationsLocked(true);
//                }
//            }
//        });
        } catch (Exception e) {
            e.printStackTrace();
            Log.d(TAG, "Error loadComments : " + e.getMessage());
        }
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

            // Save the timestamp after submission
            saveLastCommentTimestamp();

            CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.EPISODE_TABLE, radioId).document(AppConstant.Firebase.EPISODE_TABLE).collection(AppConstant.Firebase.EPISODE_TABLE);
            CollectionReference colRef = collectionReference.document(epId)
                    .collection(AppConstant.Firebase.COMMENT_TABLE);
//            String pushKey = colRef.document().getId();
            String pushKey = radioId + "_" + colRef.document().getId();
            String content = binding.etComment.getText().toString().trim();
            LogUtility.i(TAG, " currentUser :  " + new Gson().toJson(currentUser));
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
                        if (prefMgr.getUserSession() == null) {
                            binding.etComment.setHint(getString(R.string.add_comment));
                        } else {
                            currentUser = prefMgr.getUserSession();
                            binding.etComment.setHint(String.format(getString(R.string.label_comment_as), currentUser.getName()));
                        }
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
        // 1. Check Internet Connection First
        if (!hasInternetConnection()) {
            updateNetworkStatus(false); // Show network error indicator
            showSnackBar(getString(R.string.check_internet_connection));
//            showSnackBar(getString(R.string.check_internet_connection), Snackbar.LENGTH_LONG);
            highlightNetworkError();
            return false;
        }

        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
            return false;
        }

        // 3. Validate Comment Content
        String commentText = binding.etComment.getText().toString().trim();

        if (TextUtils.isEmpty(commentText)) {
            handleEmptyComment();
            return false;
        }

        // 4. Validate Comment Length
        int maxCommentLength = 500; // Set your preferred limit
        if (commentText.length() > maxCommentLength) {
            showLengthError(maxCommentLength);
            return false;
        }

        // 5. Validate Spam Protection
        if (isTooFrequentSubmission()) {
            showSnackBar(getString(R.string.error_comment_too_frequent));
            return false;
        }

        return true;
    }

    // Supporting methods
    private void showSignInDialog() {
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_sign_in_required),
                getString(R.string.message_sign_in_to_perform),
                new ButtonConfig(getString(R.string.label_cancel), null),
                new ButtonConfig(getString(R.string.label_login), v -> {
                    startActivity(IntentHelper.intentFormSignUp(this, false));
                })
        );
        showWarningDialog(config);
    }

    public void showInteractiveDialog(ModelConfig config) {
        // Create AlertDialog Builder
        AlertDialog.Builder builder = new AlertDialog.Builder(this);

        // Set Icon (if provided)
        if (config.getIcon() != -1) {
            builder.setIcon(config.getIcon());
        }

        // Set Title and Message
        builder.setTitle(config.getTitle())
                .setMessage(config.getTitle());

        // Set Negative Button (if provided)
        if (config.getBtnCancel() != null) {
            builder.setNegativeButton(config.getBtnCancel().getName(), (dialog, which) -> {
                if (config.getBtnCancel().getOnClickListener() != null) {
                    config.getBtnCancel().getOnClickListener().onClick(null);
                }
                dialog.dismiss();
            });
        }

        // Set Positive Button (if provided)
        if (config.getBtnConfirm() != null) {
            builder.setPositiveButton(config.getBtnConfirm().getName(), (dialog, which) -> {
                if (config.getBtnConfirm().getOnClickListener() != null) {
                    config.getBtnConfirm().getOnClickListener().onClick(null);
                }
                dialog.dismiss();
            });
        }

        // Create and Show Dialog
        AlertDialog dialog = builder.create();
        dialog.show();
    }

    private void handleEmptyComment() {
        binding.etComment.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
        binding.etComment.setError(getString(R.string.error_comment_empty));
        binding.etComment.requestFocus();
    }

    private void showLengthError(int maxLength) {
        String message = getString(R.string.error_comment_too_long, maxLength);
        binding.etComment.setError(message);
        binding.etComment.requestFocus();
        showSnackBar(message);
    }

    private boolean isTooFrequentSubmission() {
        long lastCommentTime = getLastCommentTimestamp();
        long cooldownPeriod = TimeUnit.SECONDS.toMillis(5); // 5 second cooldown
//        long cooldownPeriod = TimeUnit.MINUTES.toMillis(1); // 1 minute cooldown
        return (System.currentTimeMillis() - lastCommentTime) < cooldownPeriod;
    }

    private void saveLastCommentTimestamp() {
        prefMgr.setValue(AppConstant.General.LAST_COMMENT_TIMESTAMP, System.currentTimeMillis());
    }

    private long getLastCommentTimestamp() {
        return prefMgr.getValue(AppConstant.General.LAST_COMMENT_TIMESTAMP);
    }

    private void highlightNetworkError() {
        binding.networkStatusIndicator.setVisibility(View.VISIBLE);
        new Handler().postDelayed(() ->
                binding.networkStatusIndicator.setVisibility(View.GONE), 3000);
    }


    private void updateNetworkStatusZ(boolean isConnected) {
        if (isConnected) {
            networkStatusIndicator.setVisibility(View.GONE);
        } else {
            networkStatusIndicator.setVisibility(View.VISIBLE);
            new Handler().postDelayed(() ->
                    networkStatusIndicator.setVisibility(View.GONE), 3000); // Hide after 3 seconds
        }
    }

    private void updateNetworkStatus(boolean isConnected) {
        if (isConnected) {
            networkStatusIndicator.animate()
                    .alpha(0f)
                    .setDuration(300)
                    .withEndAction(() -> networkStatusIndicator.setVisibility(View.GONE))
                    .start();
        } else {
            networkStatusIndicator.setAlpha(0f);
            networkStatusIndicator.setVisibility(View.VISIBLE);
            networkStatusIndicator.animate()
                    .alpha(1f)
                    .setDuration(300)
                    .start();
            new Handler().postDelayed(() ->
                    networkStatusIndicator.animate()
                            .alpha(0f)
                            .setDuration(300)
                            .withEndAction(() -> networkStatusIndicator.setVisibility(View.GONE))
                            .start(), 3000);
        }
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

    private Parcelable recyclerViewState;

    @Override
    protected void onPause() {
        super.onPause();
        recyclerViewState = binding.rvComments.getLayoutManager().onSaveInstanceState();
    }

    @Override
    protected void onResume() {
        super.onResume();
        binding.rvComments.setAdapter(null);
        binding.rvComments.setLayoutManager(null);

        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
        binding.rvComments.setLayoutManager(linearLayoutManager);
        binding.rvComments.setAdapter(commentsAdapter);

        commentsAdapter.startListening(); // Restart FirestoreRecyclerAdapter
        if (recyclerViewState != null) {
            binding.rvComments.getLayoutManager().onRestoreInstanceState(recyclerViewState);
        }
    }


    @Override
    public void onReportClick(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
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
    }

    @Override
    public void onUserCommentClick(String userId) {
        postComment();
    }

    @Override
    public void onLikeClick(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
            comment.setEpisodeId(epId);
            ugcManager.handleCommentAction(comment, CommentAction.LIKE, radioId, null);
        }
    }

    @Override
    public void onDeleteClick(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
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
    }

    @Override
    public void onBlockClick(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
            View dialogView = getLayoutInflater().inflate(R.layout.dialog_block_user, null);
            EditText reasonInput = dialogView.findViewById(R.id.reason_input);

            new AlertDialog.Builder(this)
                    .setTitle(getString(R.string.label_block_user))
                    .setView(dialogView)
                    .setPositiveButton(getString(R.string.label_block), (dialog, which) -> {
                        if (!Tools.isEmpty(reasonInput)) {
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
        }
    }

    @Override
    public void onUnBlockClick(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
            showUnblockDialog(comment);
        }
    }

    @Override
    public void onUserClickProfile(String userId) {
        // Navigate to user profile
  /*      ModelConfig config = new ModelConfig(R.drawable.ic_warning, "Navigate to user profile", "Would you like to navigate to user profile?", new ButtonConfig(getString(R.string.label_cancel)), new ButtonConfig(getString(R.string.label_confirm), new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Comment comment = new Comment();
                comment.setCommentId(userId);
                ugcManager.handleCommentAction(comment, CommentAction.USER_PROFILE, radioId, new NetworkCallback() {
                    @Override
                    public void onSuccess(Object result) {
                        // Navigate to user profile
                        Intent intent = IntentHelper.userProfileActivity(CommentsActivity.this, false);
                        intent.putExtra("user_id", userId);
                        startActivity(intent);
                    }

                    @Override
                    public void onError(NetworkError error) {

                    }
                });
            }
        }));
        showWarningDialog(config);*/
    }

    private void showUnblockDialog(Comment comment) {
        // 2. Validate User Session
        if (!isAccountSignedIn()) {
            showSignInDialog();
        } else {
            new AlertDialog.Builder(this)
                    .setTitle(R.string.label_unblock_user)
                    .setMessage(R.string.confirm_unblock_user)
                    .setPositiveButton(R.string.label_unblock, (dialog, which) ->
                            ugcManager.handleCommentAction(comment, CommentAction.UNBLOCK, radioId, null)
                    )
                    .setNegativeButton(getString(R.string.label_cancel), null)
                    .show();
        }
    }
}
