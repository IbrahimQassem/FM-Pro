package com.sana.dev.fm.ui.activity;


import static com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference.DATABASE;

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
import android.widget.LinearLayout;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.Toolbar;
import androidx.core.view.ViewCompat;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentChange;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.Query;
import com.google.firebase.firestore.QuerySnapshot;
import com.google.gson.Gson;
import com.sana.dev.fm.R;
import com.sana.dev.fm.adapter.CommentsAdapter;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.Users;
import com.sana.dev.fm.ui.view.SendCommentButton;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;


import butterknife.BindView;

/**
 * Created by ibrahim
 */
public class CommentsActivity extends BaseActivity implements SendCommentButton.OnSendClickListener {
    public static final String ARG_DRAWING_START_LOCATION = "arg_drawing_start_location";
    public final String TAG = CommentsActivity.class.getSimpleName();
    @BindView(R.id.contentRoot)
    LinearLayout contentRoot;
    @BindView(R.id.rvComments)
    RecyclerView rvComments;
    @BindView(R.id.llAddComment)
    LinearLayout llAddComment;
    @BindView(R.id.etComment)
    EditText etComment;
    @BindView(R.id.btnSendComment)
    SendCommentButton btnSendComment;
    String radioId, epId;
    Query query;
    Users currentUser;
    PreferencesManager prefMng;
    private CommentsAdapter commentsAdapter;
    private int drawingStartLocation;

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

        prefMng = new PreferencesManager(this);

        initToolbar();
        setupComments();
        setupSendCommentButton();

        drawingStartLocation = getIntent().getIntExtra(ARG_DRAWING_START_LOCATION, 0);
        if (savedInstanceState == null) {
            contentRoot.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
                @Override
                public boolean onPreDraw() {
                    contentRoot.getViewTreeObserver().removeOnPreDrawListener(this);
                    startIntroAnimation();
                    return true;
                }
            });
        }
    }

    private void initToolbar() {
        Toolbar toolbar = getToolbar();
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle(null);
        (toolbar).setNavigationIcon(R.drawable.ic_arrow_back_white_24dp);
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Tools.setSystemBarColor(this, R.color.colorPrimary);
        getSupportActionBar().setTitle(R.string.label_comments);
        getIvLogo().setText(R.string.label_comments);
    }

    private void getComments() {


        query.get().addOnCompleteListener(new OnCompleteListener<QuerySnapshot>() {
            @Override
            public void onComplete(@NonNull Task<QuerySnapshot> task) {
                if (task.isSuccessful()) {
                    QuerySnapshot querySnapshot = task.getResult();
                    if (querySnapshot != null && !querySnapshot.isEmpty()) {
                        String s = String.valueOf(querySnapshot);
                        Log.d(TAG, " => " + querySnapshot.getQuery());
                        for (DocumentChange doc : querySnapshot.getDocumentChanges()) {

                            if (doc.getDocument().exists()) {
                                if (doc.getType() == DocumentChange.Type.ADDED) {

                                    Comment comment = doc.getDocument().toObject(Comment.class).withId(doc.getDocument().getId());
                                    Log.w(TAG, "comment failed." + comment.getCommentText());
                                }
//                        if (querySnapshot.getDocuments().size() == commentList.size() ) {
//                        mProgress.setVisibility(View.INVISIBLE);
//                        }
                            } else {
//                        mProgress.setVisibility(View.INVISIBLE);
                            }

                        }
                    }
                }
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                String s = String.valueOf(e.getMessage());
            }
        });


    }


    private void setupComments() {

        String s = getIntent().getStringExtra("episode");
        if (s == null) {
            showWarningDialog("بيانات البرنامج غير متوفرة", "");
            return;
        }

        Episode episode = new Gson().fromJson(s, Episode.class);
        radioId = episode.getRadioId();
        epId = episode.getEpId();

        if (prefMng.getUsers() == null) {
            etComment.setHint(getString(R.string.add_comment));
        } else {
            currentUser = prefMng.getUsers();
            etComment.setHint(String.format("تعليق كـ %s ..", currentUser.getName()));
        }

        getIvLogo().setText(episode.getEpName());

//        getComments();


        LinearLayoutManager linearLayoutManager = new LinearLayoutManager(this);
        rvComments.setLayoutManager(linearLayoutManager);
//        rvComments.setHasFixedSize(true);

        query = DATABASE.collection(FirebaseConstants.EPISODE_TABLE)
                .document(radioId)
                .collection(FirebaseConstants.EPISODE_TABLE)
                .document(epId)
                .collection(FirebaseConstants.COMMENT_TABLE)
                .orderBy("commentTime", Query.Direction.ASCENDING);

//        Query query = notebookRef.orderBy("priority", Query.Direction.DESCENDING);
        FirestoreRecyclerOptions<Comment> options = new FirestoreRecyclerOptions.Builder<Comment>()
                .setQuery(query, Comment.class)
                .build();

        commentsAdapter = new CommentsAdapter(options, this);
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
                    rvComments.scrollToPosition(positionStart);
                }

            }
        });
        rvComments.setAdapter(commentsAdapter);
//        rvComments.setOverScrollMode(View.OVER_SCROLL_NEVER);
//        rvComments.setOnScrollListener(new RecyclerView.OnScrollListener() {
//            @Override
//            public void onScrollStateChanged(RecyclerView recyclerView, int newState) {
//                if (newState == RecyclerView.SCROLL_STATE_DRAGGING) {
//                    commentsAdapter.setAnimationsLocked(true);
//                }
//            }
//        });
    }

    private void setupSendCommentButton() {
        btnSendComment.setOnSendClickListener(this);
    }

    private void startIntroAnimation() {
        ViewCompat.setElevation(getToolbar(), 0);
        contentRoot.setScaleY(0.1f);
        contentRoot.setPivotY(drawingStartLocation);
        llAddComment.setTranslationY(200);

        contentRoot.animate()
                .scaleY(1)
                .setDuration(200)
                .setInterpolator(new AccelerateInterpolator())
                .setListener(new AnimatorListenerAdapter() {
                    @Override
                    public void onAnimationEnd(Animator animation) {
                        ViewCompat.setElevation(getToolbar(), FmUtilize.dpToPx(8));
                        animateContent();
                    }
                })
                .start();
    }

    private void animateContent() {
//        commentsAdapter.updateItems();
        llAddComment.animate().translationY(0)
                .setInterpolator(new DecelerateInterpolator())
                .setDuration(200)
                .start();
    }

    @Override
    public void onBackPressed() {
        ViewCompat.setElevation(getToolbar(), 0);
        contentRoot.animate()
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

    @Override
    public void onSendClickListener(View v) {
        if (validateComment()) {
//            commentsAdapter.addItem();
//            commentsAdapter.setAnimationsLocked(false);
//            commentsAdapter.setDelayEnterAnimation(false);
//            rvComments.smoothScrollBy(0, rvComments.getChildAt(0).getHeight() * commentsAdapter.getItemCount());

//            etComment.setText(null);
//            btnSendComment.setCurrentState(SendCommentButton.STATE_DONE);

            CollectionReference colRef = DATABASE.collection(FirebaseConstants.EPISODE_TABLE)
                    .document(radioId)
                    .collection(FirebaseConstants.EPISODE_TABLE)
                    .document(epId)
                    .collection(FirebaseConstants.COMMENT_TABLE);
            String pushKey = colRef.document().getId();
            Comment comment = new Comment(pushKey, epId, currentUser.getName(), etComment.getText().toString().trim(), currentUser.getUserId(), String.valueOf(System.currentTimeMillis()), 0, null);
            colRef.add(comment).addOnSuccessListener(new OnSuccessListener<DocumentReference>() {
                @Override
                public void onSuccess(DocumentReference documentReference) {
                    etComment.setText(null);
                    btnSendComment.setCurrentState(SendCommentButton.STATE_DONE);
                    etComment.setHint(getString(R.string.add_comment));
                    etComment.setHint(String.format("تعليق كـ %s ..", currentUser.getName()));
                }
            }).addOnFailureListener(new OnFailureListener() {
                @Override
                public void onFailure(@NonNull Exception e) {
                    Log.e(TAG, "Error send comment " + e.getMessage());
                }
            });
        } else {
            btnSendComment.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
        }
    }

    private boolean validateComment() {

        if (TextUtils.isEmpty(etComment.getText())) {
//            AnimationUtil.shakeView(etComment, CommentsActivity.this);
//            btnSendComment.startAnimation(AnimationUtils.loadAnimation(this, R.anim.shake_error));
            showToast("لايوجد نص");
            return false;
        } else if (currentUser == null) {
            showNotCancelableWarningDialog(getString(R.string.label_note), getString(R.string.goto_login), new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    startLoginActivity();
                }
            });
            return false;
        } else if (!hasInternetConnection()) {
            showWarningDialog(getString(R.string.label_no_internet), getString(R.string.check_internet_connection));
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
}
