package com.sana.dev.fm.adapter;

import static com.sana.dev.fm.utils.FmUtilize.getTimeAgo;
import static com.sana.dev.fm.utils.my_firebase.FirebaseConstants.USERS_TABLE;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.firebase.ui.firestore.FirestoreRecyclerAdapter;
import com.firebase.ui.firestore.FirestoreRecyclerOptions;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Comment;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.ui.activity.CommentsActivity;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.FirebaseDatabaseReference;
import com.sana.dev.fm.utils.my_firebase.UsersRepositoryImpl;


import butterknife.BindView;
import butterknife.ButterKnife;


/**
 * Created by ibrahim on 11.11.14.
 */
public class CommentsAdapter extends FirestoreRecyclerAdapter<Comment, CommentsAdapter.CommentViewHolder> {
    private final String TAG = CommentsAdapter.class.getName();

    private final Context context;
    UsersRepositoryImpl fmRepo;
    //    private int itemsCount = 0;
    private int lastAnimatedPosition = -1;
    private boolean animationsLocked = false;
    private boolean delayEnterAnimation = true;

    public CommentsAdapter(@NonNull FirestoreRecyclerOptions<Comment> options, Context context) {
        super(options);
        this.context = context;
        fmRepo = new UsersRepositoryImpl((CommentsActivity) this.context, USERS_TABLE);
    }

//    public CommentsAdapter(Context context, List<Comment> items) {
//        this.context = context;
//        this.commentList = items;
//    }

    @NonNull
    @Override
    public CommentViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        final View view = LayoutInflater.from(context).inflate(R.layout.item_comment, parent, false);
        return new CommentViewHolder(view);
    }

    @Override
    public void onBindViewHolder(CommentViewHolder holder, int position, @NonNull Comment model) {
//        runEnterAnimation(viewHolder.itemView, position);
//        CommentViewHolder holder = (CommentViewHolder) viewHolder;

        String timeAgo = getTimeAgo(Long.parseLong(model.getCommentTime()), context);

        holder.tvComment.setText(model.getCommentText());
        holder.tvDate.setText(String.format(" %s", timeAgo));

//        int color = context.getResources().getColor(R.color.grey_20);
//        ColorFilter cf = new PorterDuffColorFilter(color, PorterDuff.Mode.MULTIPLY);
//        holder.image.setColorFilter(cf);

        getListItems(holder, model.getCommentUserId());


//        holder.tvFrom.setText(model.getCommentUser());
//        Tools.displayUserProfile(context, holder.image, documentSnapshot.getString("photoUrl"));
//        Glide.with(context /* context */)
////                .using(new FirebaseImageLoader())
//                .load(storageReference.child(userId+".jpg"))
//                .into(holder.image);
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

//    @Override
//    public int getItemCount() {
//        return commentList.size();
//    }

    private void getListItems(CommentViewHolder holder, String userId) {

        DocumentReference colRef = FirebaseDatabaseReference.DATABASE.collection(USERS_TABLE).document(userId);

        colRef.get().addOnSuccessListener(new OnSuccessListener<DocumentSnapshot>() {
            @Override
            public void onSuccess(DocumentSnapshot documentSnapshot) {
                if (documentSnapshot != null) {
                    UserModel userModel = documentSnapshot.toObject(UserModel.class);
                    holder.tvFrom.setText(userModel.getName());
                    holder.image.post(new Runnable() {
                        @Override
                        public void run() {
                            Tools.displayUserProfile(context, holder.image, userModel.getPhotoUrl());
                        }
                    });
                }
//                LogUtility.e(TAG, "getAllUsers :  " + documentSnapshot.getData());

            }
        });

//        fmRepo.getAllUsers(userId, new CallBack() {
//            @Override
//            public void onSuccess(Object object) {
////                if (isCollection(object)) {
////                   ArrayList<Users> detailsList = (ArrayList<Users>) object;
//////                    holder.tvFrom.setText(documentSnapshot.getString("name"));
//////                    holder.image.post(new Runnable() {
//////                        @Override
//////                        public void run() {
//////                            Tools.displayUserProfile(context, holder.image, documentSnapshot.getString("photoUrl"));
//////                        }
//////                    });
////                }
//                LogUtility.e(TAG,"getAllUsers :  "+object);
//
//            }
//
//            @Override
//            public void onError(Object object) {
//                LogUtility.e(TAG,"onError :  "+object);
//
//            }
//        });
    }

    public void deleteItem(int position) {
        getSnapshots().getSnapshot(position).getReference().delete();
    }


    public void setAnimationsLocked(boolean animationsLocked) {
        this.animationsLocked = animationsLocked;
    }

    public void setDelayEnterAnimation(boolean delayEnterAnimation) {
        this.delayEnterAnimation = delayEnterAnimation;
    }

    public static class CommentViewHolder extends RecyclerView.ViewHolder {
        @BindView(R.id.civ_logo)
        CircularImageView image;
        @BindView(R.id.tvFrom)
        TextView tvFrom;
        @BindView(R.id.tvComment)
        TextView tvComment;
        @BindView(R.id.tvDate)
        TextView tvDate;

        public CommentViewHolder(View view) {
            super(view);
            ButterKnife.bind(this, view);
        }
    }
}
