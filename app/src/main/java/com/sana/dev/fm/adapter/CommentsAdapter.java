package com.sana.dev.fm.adapter;

import static com.sana.dev.fm.utils.FmUtilize.getTimeAgo;

import android.content.Context;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.PopupMenu;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemCommentBinding;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ugc.CommentClickListener;


/**
 * Created by ibrahim on 11.11.14.
 */
public class CommentsAdapter extends FirestoreRecyclerAdapter<Comment, CommentsAdapter.CommentViewHolder> {
    private final String TAG = LogUtility.tag(CommentsAdapter.class);
    private final Context ctx;
    private int lastAnimatedPosition = -1;
    private boolean animationsLocked = false;
    private boolean delayEnterAnimation = true;
    private CommentClickListener listener;
    private UserModel userModel;

    public CommentsAdapter(@NonNull FirestoreRecyclerOptions<Comment> options, Context ctx, CommentClickListener listener, UserModel userModel) {
        super(options);
        this.ctx = ctx;
        this.listener = listener;
        this.userModel = userModel;
        setHasStableIds(true);
    }

    @Override
    public long getItemId(int position) {
        // Return a unique ID from your Comment model
        return getItem(position).getCommentId().hashCode();
    }

    @NonNull
    @Override
    public Comment getItem(int position) {
        return super.getItem(position);
    }

    public class CommentViewHolder extends RecyclerView.ViewHolder {
        private final ItemCommentBinding binding;
        public CommentViewHolder(ItemCommentBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    @NonNull
    @Override
    public CommentsAdapter.CommentViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        ItemCommentBinding inflate = ItemCommentBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new CommentsAdapter.CommentViewHolder(inflate);
    }

    @Override
    protected void onBindViewHolder(@NonNull CommentViewHolder holder, int position, @NonNull Comment model) {
        try {
        LogUtility.d(TAG, " Comment : " + model.toString());
        LogUtility.d(TAG, "RecyclerViewDebug Position: " + position + ", Dataset Size: " + getItemCount());

        holder.binding.tvComment.setText(model.getContent());
        holder.binding.tvFrom.setText(model.getUserName());
        String timeAgo = getTimeAgo(model.getTimestamp(), ctx);
        holder.binding.tvDate.setText(String.format("%s", timeAgo));

//        // Load user photo
//        if (model.getUserPhotoUrl() != null && !model.getUserPhotoUrl().isEmpty()) {
//            Glide.with(ctx)
//                    .load(model.getUserPhotoUrl())
//                    .circleCrop()
//                    .into(holder.binding.civLogo);
//        }


//        boolean isBlocked = blockManager.isUserBlocked(comment.getUserId());
//        holder.blockButton.setText(isBlocked ? "Unblock" : "Block");
//        holder.blockButton.setOnClickListener(v -> {
//            UserBlockManager.CommentAction action = isBlocked ?
//                    UserBlockManager.CommentAction.UNBLOCK :
//                    UserBlockManager.CommentAction.BLOCK;
//            blockManager.handleCommentAction(comment, action);
//        });

        // Set up click listeners

        // Set like status
//        boolean isLiked = model.getLikedBy().contains(auth.getCurrentUser().getUid());
        String userId = userModel != null && userModel.getUserId() != null ? userModel.getUserId() : null;

        boolean isLiked = model.getLikedBy().contains(userId);
        holder.binding.imvLike.setImageResource(isLiked ? R.drawable.ic_favorites : R.drawable.ic_heart_outline_white);
        holder.binding.imvLike.setColorFilter(ContextCompat.getColor(ctx, isLiked ? R.color.colorPrimary : R.color.grey_400));
        holder.binding.likeCountText.setTextColor(ContextCompat.getColor(ctx, isLiked ? R.color.colorPrimary : R.color.grey_400));
        holder.binding.likeCountText.setText(String.valueOf(model.getLikedBy().size()));


        // Todo
//            Tools.displayUserProfile(ctx, holder.binding.civLogo, userImg, R.drawable.ic_baseline_person);
        boolean isMyComment = model.getUserId().equals(userId);
        String userImg;
        if (isMyComment) {
            userImg = userModel != null && userModel.getPhotoUrl() != null ? userModel.getPhotoUrl() : null;

        } else {
            userImg = model != null && model.getUserPhotoUrl() != null ? model.getUserPhotoUrl() : null;
        }
        Tools.displayImageRound(ctx, holder.binding.civLogo, userImg);

        // Click listeners
        holder.binding.civLogo.setOnClickListener(v -> listener.onUserClickProfile(model.getUserId()));

//        userNameText.setOnClickListener(v -> listener.onUserClick(model.getUserId()));

        holder.binding.imvLike.setOnClickListener(v -> listener.onLikeClick(model));

        holder.binding.menuButton.setOnClickListener(v -> showPopupMenu(v, model));

//
//        holder.reportButton.setOnClickListener(v ->
//                blockManager.handleCommentAction(model, UGCUserManager.CommentAction.REPORT));

//        holder.deleteButton.setOnClickListener(v ->
//                blockManager.handleCommentAction(model, UGCUserManager.CommentAction.DELETE));
//
//        holder.blockButton.setOnClickListener(v ->
//                blockManager.handleCommentAction(model, UGCUserManager.CommentAction.BLOCK));
//
//        holder.binding.civLogo.setOnClickListener(v ->
//                blockManager.navigateToUserProfile(model.getUserId()));
////        getListItems(holder, model.getUserId());
        } catch (Exception e) {
            e.printStackTrace();
            Log.d(TAG, "Error onBindViewHolder : " + e.getMessage());
        }
    }

    private void showPopupMenu(View view, Comment comment) {
        PopupMenu popup = new PopupMenu(ctx, view);
        popup.inflate(R.menu.menu_comment);

        String userId = userModel != null && userModel.getUserId() != null ? userModel.getUserId() : null;

        // Show delete option only for comment owner or admin
        popup.getMenu().findItem(R.id.action_delete).setVisible(
                comment.getUserId().equals(userId));

        popup.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == R.id.action_report) {
                listener.onReportClick(comment);
                return true;
            } else if (item.getItemId() == R.id.action_block) {
                listener.onBlockClick(comment);
                return true;
            } else if (item.getItemId() == R.id.action_delete) {
                listener.onDeleteClick(comment);
                return true;
            }
            return false;
        });
        popup.show();
    }


/*
    private void getListItems(CommentViewHolder holder, String userId) {
        CollectionReference collectionReference = firestoreDbUtility.getCollectionReference(AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
//        DocumentReference colRef = FirebaseDatabaseReference.getTopLevelCollection().getFirestore().collection(USERS_TABLE).document(userId);
        DocumentReference colRef = collectionReference.document(userId);
        colRef.get().addOnSuccessListener(new OnSuccessListener<DocumentSnapshot>() {
            @Override
            public void onSuccess(DocumentSnapshot documentSnapshot) {
                if (documentSnapshot != null) {
                    UserModel userModel = documentSnapshot.toObject(UserModel.class);
                    LogUtility.e(TAG, "getAllUsers :  " + new Gson().toJson(userModel));

//                    if (!isEmpty(userModel.getName()))
                    holder.binding.tvFrom.setText(userModel.getName());
                    if (!Tools.isEmpty(userModel.getPhotoUrl()))
                        Tools.displayUserProfile(ctx, holder.binding.civLogo, userModel.getPhotoUrl(), R.drawable.ic_baseline_person);
//                    Tools.displayImageRound(ctx, holder.binding.civLogo, userModel.getPhotoUrl());


//                    if (URLUtil.isValidUrl(userModel.getPhotoUrl()))
//                        holder.binding.civLogo.post(new Runnable() {
//                            @Override
//                            public void run() {
//                                Tools.displayUserProfile(ctx, holder.binding.civLogo, userModel.getPhotoUrl(), R.drawable.ic_baseline_person);
//                            }
//                        });
                }
//                LogUtility.e(TAG, "getAllUsers :  " + documentSnapshot.getData());
            }
        });
    }
*/

/*
    private void runEnterAnimation(View view, int position) {
        if (animationsLocked) return;

        if (position > lastAnimatedPosition) {
            lastAnimatedPosition = position;
            view.setTranslationY(100);
            view.setAlpha(0.f);
            view.animate()
                    .translationY(0).alpha(1.f)
                    .setStartDelay(delayEnterAnimation ? 20 * (position) : 0)
                    .setInterpolator(new DecelerateInterpolator(2.f))
                    .setDuration(300)
                    .setListener(new AnimatorListenerAdapter() {
                        @Override
                        public void onAnimationEnd(Animator animation) {
                            animationsLocked = true;
                        }
                    })
                    .start();
        }
    }
*/

/*    public void deleteItem(int position) {
        getSnapshots().getSnapshot(position).getReference().delete();
    }

    public void setAnimationsLocked(boolean animationsLocked) {
        this.animationsLocked = animationsLocked;
    }

    public void setDelayEnterAnimation(boolean delayEnterAnimation) {
        this.delayEnterAnimation = delayEnterAnimation;
    }*/

}
