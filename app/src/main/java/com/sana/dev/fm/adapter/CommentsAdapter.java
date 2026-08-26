package com.sana.dev.fm.adapter;

import static com.sana.dev.fm.utils.FmUtilize.getTimeAgo;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.sana.dev.fm.databinding.ItemCommentBinding;
import com.sana.dev.fm.model.Comment;


/**
 * Created by ibrahim on 11.11.14.
 */
public class CommentsAdapter extends FirestoreRecyclerAdapter<Comment, CommentsAdapter.CommentViewHolder> {
    private final Context ctx;
    private int lastAnimatedPosition = -1;
    private boolean animationsLocked = false;
    private boolean delayEnterAnimation = true;

    public CommentsAdapter(@NonNull FirestoreRecyclerOptions<Comment> options, Context ctx) {
        super(options);
        this.ctx = ctx;
    }

    @NonNull
    @Override
    public Comment getItem(int position) {
        return super.getItem(position);
    }

    public static class CommentViewHolder extends RecyclerView.ViewHolder {
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
        holder.binding.tvComment.setText(model.getCommentText());
        holder.binding.tvFrom.setText(model.getCommentUser());
        String timeAgo = getTimeAgo(Long.parseLong(model.getCommentTime()), ctx);
        holder.binding.tvDate.setText(String.format("%s", timeAgo));
    }

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

    public void setAnimationsLocked(boolean animationsLocked) {
        this.animationsLocked = animationsLocked;
    }

    public void setDelayEnterAnimation(boolean delayEnterAnimation) {
        this.delayEnterAnimation = delayEnterAnimation;
    }

}
