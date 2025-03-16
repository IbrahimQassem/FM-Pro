//package com.sana.dev.fm.ui.activity;
//
//import android.content.Context;
//import android.content.Intent;
//import android.os.Bundle;
//import android.text.Editable;
//import android.text.TextWatcher;
//import android.view.View;
//import android.view.inputmethod.InputMethodManager;
//import android.widget.Button;
//import android.widget.EditText;
//import android.widget.Toast;
//
//import androidx.annotation.NonNull;
//import androidx.appcompat.app.AlertDialog;
//import androidx.appcompat.app.AppCompatActivity;
//import androidx.recyclerview.widget.LinearLayoutManager;
//import androidx.recyclerview.widget.RecyclerView;
//
//import com.google.firebase.auth.FirebaseAuth;
//import com.google.firebase.auth.FirebaseUser;
//import com.google.firebase.firestore.DocumentReference;
//import com.google.firebase.firestore.DocumentSnapshot;
//import com.google.firebase.firestore.FirebaseFirestore;
//import com.google.firebase.firestore.Query;
//import com.google.gson.Gson;
//import com.sana.dev.fm.R;
//import com.sana.dev.fm.adapter.CommentUGCAdapter;
//import com.sana.dev.fm.model.Comment;
//import com.sana.dev.fm.model.Episode;
//import com.sana.dev.fm.ui.activity.appuser.UserProfileActivity;
//import com.sana.dev.fm.utils.ugc.CommentAction;
//import com.sana.dev.fm.utils.ugc.CommentClickListener;
//import com.sana.dev.fm.utils.ugc.UserBlockManager;
//
//import java.util.ArrayList;
//import java.util.List;
//
//public class CommentsUGCActivity extends AppCompatActivity implements CommentClickListener {
//    private RecyclerView recyclerView;
//    private EditText commentInput;
//    private Button sendButton;
//    private CommentUGCAdapter adapter;
//    private List<Comment> comments;
//    private FirebaseFirestore db;
//    private FirebaseAuth auth;
//    private String postId,radioId;
//    private static final int COMMENT_LIMIT = 50;
//    private boolean isLoading = false;
//    private UserBlockManager blockManager;
//
//    public static void startActivity(Context context, Episode episode) {
//        Intent intent = new Intent(context, CommentsUGCActivity.class);
//        String obj = (new Gson().toJson(episode));
//        intent.putExtra("episode", obj);
//        intent.putExtra("post_id", episode.getProgramId());
//        intent.putExtra("radioId", episode.getRadioId());
//        context.startActivity(intent);
//    }
//
//    @Override
//    protected void onCreate(Bundle savedInstanceState) {
//        super.onCreate(savedInstanceState);
//        setContentView(R.layout.activity_comments_ugcactivity);
//
//        postId = getIntent().getStringExtra("post_id");
//        radioId = getIntent().getStringExtra("radioId");
//        if (postId == null) {
//            finish();
//            return;
//        }
//
//        initializeViews();
//        setupFirebase();
//        setupRecyclerView();
//        loadComments();
//        setupCommentInput();
//    }
//
//    private void initializeViews() {
//        recyclerView = findViewById(R.id.recycler_view);
//        commentInput = findViewById(R.id.comment_input);
//        sendButton = findViewById(R.id.send_button);
//        comments = new ArrayList<>();
//    }
//
//    private void setupFirebase() {
//        db = FirebaseFirestore.getInstance();
//        auth = FirebaseAuth.getInstance();
//        blockManager = UserBlockManager.getInstance(this, this);
//    }
//
//    private void setupRecyclerView() {
//        adapter = new CommentUGCAdapter(this, comments, postId, this);
//        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
//        recyclerView.setLayoutManager(layoutManager);
//        recyclerView.setAdapter(adapter);
//
//        // Pagination
//        recyclerView.addOnScrollListener(new RecyclerView.OnScrollListener() {
//            @Override
//            public void onScrolled(@NonNull RecyclerView recyclerView, int dx, int dy) {
//                super.onScrolled(recyclerView, dx, dy);
//                if (!isLoading && layoutManager.findLastVisibleItemPosition() == comments.size() - 1) {
//                    loadMoreComments();
//                }
//            }
//        });
//    }
//
//    private void setupCommentInput() {
//        sendButton.setOnClickListener(v -> postComment());
//
//        // Input validation
//        commentInput.addTextChangedListener(new TextWatcher() {
//            @Override
//            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
//            }
//
//            @Override
//            public void onTextChanged(CharSequence s, int start, int before, int count) {
//                sendButton.setEnabled(s.toString().trim().length() > 0);
//            }
//
//            @Override
//            public void afterTextChanged(Editable s) {
//            }
//        });
//    }
//
//    private void loadComments() {
//        isLoading = true;
//        db.collection("posts").document(postId)
//                .collection("comments")
//                .orderBy("timestamp", Query.Direction.DESCENDING)
//                .limit(COMMENT_LIMIT)
//                .addSnapshotListener((value, error) -> {
//                    if (error != null) {
//                        showError("Error loading comments");
//                        return;
//                    }
//
//                    comments.clear();
//                    for (DocumentSnapshot doc : value.getDocuments()) {
//                        Comment comment = doc.toObject(Comment.class);
//                        comment.setCommentId(doc.getId());
//                        comments.add(comment);
//                    }
//                    adapter.notifyDataSetChanged();
//                    isLoading = false;
//                });
//    }
//
//    private void loadMoreComments() {
//        // Implement pagination logic
//    }
//
//    private void postComment() {
//        String content = commentInput.getText().toString().trim();
//        if (content.isEmpty()) return;
//
//        // Content moderation check
//        if (!isAppropriateContent(content)) {
//            showError("Please keep comments appropriate");
//            return;
//        }
//
//        FirebaseUser user = auth.getCurrentUser();
//        Comment comment = new Comment(
//                user.getUid(),
//                user.getUid(),
//                user.getDisplayName(),
//                user.getPhotoUrl() != null ? user.getPhotoUrl().toString() : "",
//                content
//        );
//
//        db.collection("posts").document(postId)
//                .collection("comments")
//                .add(comment)
//                .addOnSuccessListener(documentReference -> {
//                    commentInput.setText("");
//                    hideKeyboard();
//                })
//                .addOnFailureListener(e -> showError("Failed to post comment"));
//    }
//
//
//    private boolean isAppropriateContent(String content) {
//        // Implement content moderation logic
//        // This is a basic example - you should implement more thorough checking
//        String[] inappropriateWords = {"badword1", "badword2"};
//        content = content.toLowerCase();
//
//        for (String word : inappropriateWords) {
//            if (content.contains(word)) return false;
//        }
//
//        return true;
//    }
//
//    @Override
//    public void onReportClick(Comment comment) {
//        new AlertDialog.Builder(this)
//                .setTitle("Report Comment")
//                .setMessage("Are you sure you want to report this comment?")
//                .setPositiveButton("Report", (dialog, which) ->
////                        reportComment(comment)
//                       blockManager.handleCommentAction(comment,CommentAction.REPORT,radioId)
//                )
//                .setNegativeButton("Cancel", null)
//                .show();
//    }
//
//    private void reportComment(Comment comment) {
//        String userId = auth.getCurrentUser().getUid();
//
//        // Check if user already reported
//        if (comment.getReportedBy().contains(userId)) {
//            showError("You have already reported this comment");
//            return;
//        }
//
//        DocumentReference commentRef = db.collection("posts")
//                .document(postId)
//                .collection("comments")
//                .document(comment.getCommentId());
//
//        db.runTransaction(transaction -> {
//            DocumentSnapshot snapshot = transaction.get(commentRef);
//            Comment updatedComment = snapshot.toObject(Comment.class);
//
//            updatedComment.getReportedBy().add(userId);
//            updatedComment.setReportCount(updatedComment.getReportCount() + 1);
//
//            // Auto-hide comment if report threshold reached
//            if (updatedComment.getReportCount() >= 5) {
//                updatedComment.setReviewed(true);
//                // Move to moderation queue
//                db.collection("moderation")
//                        .document(comment.getCommentId())
//                        .set(updatedComment);
//            }
//
//            transaction.set(commentRef, updatedComment);
//            return null;
//        }).addOnSuccessListener(result ->
//                Toast.makeText(this, "Comment reported", Toast.LENGTH_SHORT).show()
//        ).addOnFailureListener(e ->
//                showError("Failed to report comment")
//        );
//    }
//
//    @Override
//    public void onUserCommentClick(String userId) {
//        postComment();
//    }
//
//    @Override
//    public void onLikeClick(Comment comment) {
//        comment.setEpisodeId(postId);
//        blockManager.handleCommentAction(comment,CommentAction.LIKE,radioId);
////        String userId = auth.getCurrentUser().getUid();
////        DocumentReference commentRef = db.collection("posts")
////                .document(postId)
////                .collection("comments")
////                .document(comment.getId());
////
////        db.runTransaction(transaction -> {
////            DocumentSnapshot snapshot = transaction.get(commentRef);
////            Comment updatedComment = snapshot.toObject(Comment.class);
////
////            if (updatedComment.getLikedBy().contains(userId)) {
////                updatedComment.getLikedBy().remove(userId);
////            } else {
////                updatedComment.getLikedBy().add(userId);
////            }
////
////            transaction.set(commentRef, updatedComment);
////            return null;
////        }).addOnFailureListener(e -> showError("Failed to update like"));
//    }
//
//    private void showBlockDialog(Comment comment) {
//        if (blockManager.isUserBlocked(comment.getUserId())) {
//            showUnblockDialog(comment);
//        } else {
//            View dialogView = getLayoutInflater().inflate(R.layout.dialog_block_user, null);
//            EditText reasonInput = dialogView.findViewById(R.id.reason_input);
//
//            new AlertDialog.Builder(this)
//                    .setTitle("Block User")
//                    .setView(dialogView)
//                    .setPositiveButton("Block", (dialog, which) -> {
//                        String reason = reasonInput.getText().toString().trim();
//                        blockUser(comment, reason);
//                    })
//                    .setNegativeButton("Cancel", null)
//                    .show();
//        }
//    }
//
//    private void showUnblockDialog(Comment comment) {
//        new AlertDialog.Builder(this)
//                .setTitle("Unblock User")
//                .setMessage("Would you like to unblock this user?")
//                .setPositiveButton("Unblock", (dialog, which) ->
//                        blockManager.handleCommentAction(comment, CommentAction.UNBLOCK,radioId)
//                )
//                .setNegativeButton("Cancel", null)
//                .show();
//    }
//
//    private void blockUser(Comment comment, String reason) {
//        comment.setContent(reason);
//        blockManager.handleCommentAction(comment,CommentAction.BLOCK,radioId);
////        blockManager.blockUser(userId, reason, new OnBlockCompleteListener() {
////            @Override
////            public void onSuccess() {
////                Toast.makeText(CommentsUGCActivity.this, "User blocked successfully", Toast.LENGTH_SHORT).show();
////                updateBlockButtonState();
////            }
////
////            @Override
////            public void onFailure(Exception e) {
////                Toast.makeText(CommentsUGCActivity.this, "Failed to block user", Toast.LENGTH_SHORT).show();
////            }
////        });
//    }
//
//    private void updateBlockButtonState() {
////        Button blockButton = findViewById(R.id.block_button);
////        if (blockManager.isUserBlocked(userId)) {
////            blockButton.setText("Unblock User");
////        } else {
////            blockButton.setText("Block User");
////        }
//    }
//
//    @Override
//    protected void onDestroy() {
//        super.onDestroy();
//        blockManager.cleanup();
//    }
//
//    @Override
//    public void onBlockClick(Comment comment) {
//        showBlockDialog(comment);
////        new AlertDialog.Builder(this)
////                .setTitle("Delete Comment")
////                .setMessage("Are you sure you want to delete this comment?")
////                .setPositiveButton("Delete", (dialog, which) -> blockUser(comment))
////                .setNegativeButton("Cancel", null)
////                .show();
//    }
//
//    @Override
//    public void onUnBlockClick(Comment comment) {
//        // Update UI to reflect unblocked state
////        notifyItemChanged(comments.indexOf(comment));
////        showUnblockConfirmation(comment);
//    }
//
//    @Override
//    public void onUserClickProfile(String userId) {
//        // Navigate to user profile
//        Intent intent = new Intent(this, UserProfileActivity.class);
//        intent.putExtra("user_id", userId);
//        startActivity(intent);
//    }
//
//    @Override
//    public void onDeleteClick(Comment comment) {
//        new AlertDialog.Builder(this)
//                .setTitle("Delete Comment")
//                .setMessage("Are you sure you want to delete this comment?")
//                .setPositiveButton("Delete", (dialog, which) -> deleteComment(comment))
//                .setNegativeButton("Cancel", null)
//                .show();
//    }
//
//    private void deleteComment(Comment comment) {
//        db.collection("posts")
//                .document(postId)
//                .collection("comments")
//                .document(comment.getCommentId())
//                .delete()
//                .addOnFailureListener(e -> showError("Failed to delete comment"));
//    }
//
//    private void showError(String message) {
//        Toast.makeText(this, message, Toast.LENGTH_SHORT).show();
//    }
//
//    private void hideKeyboard() {
//        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
//        imm.hideSoftInputFromWindow(commentInput.getWindowToken(), 0);
//    }
//}