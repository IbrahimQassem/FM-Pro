package com.sana.dev.fm.adapter;

import android.content.Context;
import android.text.format.DateUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.widget.PopupMenu;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.utils.ugc.CommentAction;
import com.sana.dev.fm.utils.ugc.CommentClickListener;
import com.sana.dev.fm.utils.ugc.UserBlockManager;

import java.util.List;

public class CommentUGCAdapter extends RecyclerView.Adapter<CommentUGCAdapter.CommentViewHolder> {
    private Context context;
    private List<Comment> comments;
    private FirebaseAuth auth;
    private FirebaseFirestore db;
    private String postId;
    private CommentClickListener listener;
    private UserBlockManager blockManager;


    public CommentUGCAdapter(Context context, List<Comment> comments, String postId, CommentClickListener listener) {
        this.context = context;
        this.comments = comments;
        this.postId = postId;
        this.listener = listener;
        this.auth = FirebaseAuth.getInstance();
        this.db = FirebaseFirestore.getInstance();
        this.blockManager =  UserBlockManager.getInstance(context, listener);
    }

    @NonNull
    @Override
    public CommentViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_ugc_comment, parent, false);
        return new CommentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull CommentViewHolder holder, int position) {
        Comment comment = comments.get(position);
        holder.bind(comment);
        // Skip showing comments from blocked users
        if (blockManager.isUserBlocked(comment.getUserId())) {
            holder.showBlockedComment();
        } else {
            holder.bind(comment);
        }
    }

    @Override
    public int getItemCount() {
        return comments.size();
    }

    class CommentViewHolder extends RecyclerView.ViewHolder {
        private ImageView userPhotoView;
        private TextView userNameText;
        private TextView contentText;
        private TextView timestampText;
        private ImageButton menuButton;
        private ImageButton likeButton;
        private TextView likeCountText;
        private View normalContent;
        private View blockedContent;
        private Button unblockButton;

        public CommentViewHolder(@NonNull View itemView) {
            super(itemView);
            userPhotoView = itemView.findViewById(R.id.user_photo);
            userNameText = itemView.findViewById(R.id.user_name);
            contentText = itemView.findViewById(R.id.comment_content);
            timestampText = itemView.findViewById(R.id.timestamp);
            menuButton = itemView.findViewById(R.id.menu_button);
            likeButton = itemView.findViewById(R.id.like_button);
            likeCountText = itemView.findViewById(R.id.like_count);
            normalContent = itemView.findViewById(R.id.normal_content);
            blockedContent = itemView.findViewById(R.id.blocked_content);
            unblockButton = itemView.findViewById(R.id.unblock_button);
        }

        void bind(Comment comment) {
            // Set up comment UI
            userNameText.setText(comment.getUserName());
            contentText.setText(comment.getContent());
            timestampText.setText(formatTimestamp(comment.getTimestamp()));

            // Load user photo
            if (comment.getUserPhotoUrl() != null && !comment.getUserPhotoUrl().isEmpty()) {
                Glide.with(context)
                        .load(comment.getUserPhotoUrl())
                        .circleCrop()
                        .into(userPhotoView);
            }

            // Set like status
            boolean isLiked = comment.getLikedBy().contains(auth.getCurrentUser().getUid());
            likeButton.setImageResource(isLiked ?
                    R.drawable.ic_favorites : R.drawable.ic_heart_outline_white);
            likeCountText.setText(String.valueOf(comment.getLikedBy().size()));

            // Click listeners
            userPhotoView.setOnClickListener(v ->
                    listener.onUserCommentClick(comment.getUserId()));

            userNameText.setOnClickListener(v ->
                    listener.onUserCommentClick(comment.getUserId()));

            likeButton.setOnClickListener(v ->
                    listener.onLikeClick(comment));

            menuButton.setOnClickListener(v -> showPopupMenu(v, comment));

        }

        private void showPopupMenu(View view, Comment comment) {
            PopupMenu popup = new PopupMenu(context, view);
            popup.inflate(R.menu.menu_comment);

            // Show delete option only for comment owner or admin
            popup.getMenu().findItem(R.id.action_delete).setVisible(
                    comment.getUserId().equals(auth.getCurrentUser().getUid()));

            popup.setOnMenuItemClickListener(item -> {
                if (item.getItemId() == R.id.action_report) {
                    listener.onReportClick(comment);
                    return true;
                } else if (item.getItemId() == R.id.action_block) {
                    listener.onBlockClick(comment);
                    return true;
                }else if (item.getItemId() == R.id.action_delete) {
                    listener.onDeleteClick(comment);
                    return true;
                }
                return false;
            });
            popup.show();
        }

        void showBlockedComment() {
            normalContent.setVisibility(View.GONE);
            blockedContent.setVisibility(View.VISIBLE);

            unblockButton.setOnClickListener(v -> {
                int position = getAdapterPosition();
                if (position != RecyclerView.NO_POSITION) {
                    Comment comment = comments.get(position);
                    showUnblockConfirmation(comment);
                }
            });
        }

        private void showUnblockConfirmation(Comment comment) {
            new AlertDialog.Builder(context)
                    .setTitle("Unblock User")
                    .setMessage("Would you like to unblock this user?")
                    .setPositiveButton("Unblock", (dialog, which) -> {
                        blockManager.handleCommentAction(comment, CommentAction.UNBLOCK,null);
//                        blockManager.handleCommentAction(comment.getUserId(), new OnBlockCompleteListener() {
//                            @Override
//                            public void onSuccess() {
//                                notifyDataSetChanged();
//                            }
//
//                            @Override
//                            public void onFailure(Exception e) {
//                                Toast.makeText(context, "Failed to unblock user", Toast.LENGTH_SHORT).show();
//                            }
//                        });
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        }


        private String formatTimestamp(long timestamp) {
            // Implement timestamp formatting logic
            return DateUtils.getRelativeTimeSpanString(timestamp).toString();
        }
    }
}