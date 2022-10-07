package com.sana.dev.fm.adapter;


import android.content.Context;
import android.graphics.Typeface;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.google.android.flexbox.FlexboxLayout;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.gson.Gson;
import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.ViewAnimation;


import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.core.content.res.ResourcesCompat;
import androidx.core.widget.NestedScrollView;
import androidx.recyclerview.widget.RecyclerView;

import java.util.Collections;
import java.util.Map;


public class ChatHolder extends RecyclerView.ViewHolder {
    private final CircularImageView profile;
    private final  ImageView image, imv_like, imv_comment, bt_toggle;
    private final TextView tvTitle;
    private final TextView tvDesc;
    private final TextView tv_time;
    private final TextView tvDate;
    private final TextView tvTime;
    private final TextView tv_subtitle, txt_likes;
    private final View lyt_parent, lyt_more;
    private final NestedScrollView nested_scroll_view;
    private final FlexboxLayout flex_show_time;
    private final LinearLayout lyt_comment_parent;
    private Context ctx;
    private OnItemClickListener mOnItemClickListener;
    private OnLongItemClickListener mOnLongItemClickListener;
    private int position ;
//    private int mExpandedPosition = -2;


    public ChatHolder(@NonNull View itemView) {
        super(itemView);
        profile = itemView.findViewById(R.id.profile);
        image = itemView.findViewById(R.id.image);
        tvTitle = itemView.findViewById(R.id.tvTitle);
        tvDesc = itemView.findViewById(R.id.tvSubTitle);
        tvDate = itemView.findViewById(R.id.tvDate);
        tv_time = itemView.findViewById(R.id.tv_time);
        tvTime = itemView.findViewById(R.id.tvTime);
        tv_subtitle = itemView.findViewById(R.id.tv_subtitle);
        txt_likes = itemView.findViewById(R.id.txt_likes);
        imv_like = itemView.findViewById(R.id.imv_like);
        imv_comment = itemView.findViewById(R.id.imv_comment);
        lyt_parent = itemView.findViewById(R.id.lyt_parent);
        lyt_more = itemView.findViewById(R.id.lyt_more);
        nested_scroll_view = itemView.findViewById(R.id.nested_scroll_view);
        bt_toggle = itemView.findViewById(R.id.bt_toggle);
        flex_show_time = itemView.findViewById(R.id.flex_show_time);
        lyt_comment_parent = itemView.findViewById(R.id.lyt_comment_parent);

        ctx = itemView.getContext();
//        position = (int) itemView.getTag();
//        position = getAbsoluteAdapterPosition();

    }

    public void bind(@NonNull Episode mode, int position) {
        this.position = position;
//        initExpand(mode);
        initBindViewHolder(mode);
        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
//        setIsSender(currentUser != null && chat.getUid().equals(currentUser.getUid()));
    }



    private void initBindViewHolder(@Nullable Episode episode) {
        tvTitle.setText(episode.getEpName());
        tvDesc.setText(episode.getEpDesc());
        tv_subtitle.setText(episode.getEpAnnouncer());
//        String st = "" +  getFormattedTimeEvent(episode.getDateTimeModel().getTimeStart());
//        tv_time.setText(st);
        if (episode.getDateTimeModel() != null){
            LogUtility.e(LogUtility.TAG, "date  getDateStart : " + new Gson().toJson(FmUtilize.modifyDateLayout(episode.getDateTimeModel().getDateStart())));
            LogUtility.e(LogUtility.TAG, "date  getDateEnd : " + new Gson().toJson(FmUtilize.modifyDateLayout(episode.getDateTimeModel().getDateEnd())));
        }
//        tv_time.setText(Tools.getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList())));
        tvDate.setText(Tools.getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList())));
        Tools.displayImageRound(ctx, image, episode.getEpProfile());
        Tools.displayImageOriginal(ctx, image, episode.getEpProfile());
        Tools.displayImageRound(ctx, profile, episode.getEpProfile());

        Map<String, Boolean> states = episode.getEpisodeLikes();
        if (episode.userId != null) {
            for (Map.Entry<String, Boolean> pair : states.entrySet()) {
//                    LogUtility.e("getEpisodeLikes", String.format("Key (name) is: %s, Value   is : %s", pair.getKey(), pair.getValue()));
                if (Boolean.TRUE.equals(states.get(episode.userId))) {
                    //Do this
                    episode.isLiked = pair.getValue();
                    imv_like.setColorFilter(ContextCompat.getColor(ctx, R.color.colorAccent));
                }
            }
        }
        int countLike = Collections.frequency(states.values(), true);
        txt_likes.setText(ctx.getResources().getQuantityString(
                R.plurals.likes_count, countLike, countLike
        ));

        profile.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        lyt_comment_parent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });


        lyt_parent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        lyt_parent.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                if (mOnLongItemClickListener != null) {
                    mOnLongItemClickListener.onLongItemClick(v, episode, position);
                }
                return false;
            }
        });

        imv_comment.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(view, episode, position);
                }
            }
        });

        imv_like.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });
    }

    private void initExpand(@Nullable Episode episode) {
        final boolean isExpanded = position == episode.mExpandedPosition;
        if (isExpanded) {
            Tools.toggleArrow(bt_toggle);
            ViewAnimation.expand(lyt_more, new ViewAnimation.AnimListener() {
                public void onFinish() {
                    Tools.nestedScrollTo(nested_scroll_view, lyt_more);
                }
            });
        } else {
            ViewAnimation.collapse(lyt_more);
        }
        bt_toggle.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
                episode.mExpandedPosition = isExpanded ? -1 : position;
                Tools.toggleArrow(bt_toggle);
//                LogUtility.e(  "  bt_toggle - position : "  ,position +" mExpandedPosition : "+ String.valueOf(episode.mExpandedPosition));
            }
        });

        for (int i2 = 0; i2 < FmUtilize.safeList(episode.getShowTimeList()).size(); i2++) {
            int pixels = Math.round(Tools.dip2px(ctx, 40));

            DateTimeModel timeModel = episode.getShowTimeList().get(i2);

//            DateTimeModel _timeModel = new DateTimeModel(timeModel.getTimeStart(), timeModel.getTimeEnd(), timeModel.isItMainTime());
            LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    pixels);

            Button btn = new Button(ctx);
//            btn.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, pixels));

            btn.setId(i2);
//            final int id_ = btn.getId();
//            btn.setText("button " + id_);
            btn.setText(Tools.getFormattedTimeEvent(timeModel.getTimeStart()));
//            btn.setBackgroundColor(Color.rgb(70, 80, 90));
            final int sdk = android.os.Build.VERSION.SDK_INT;
            if (sdk < android.os.Build.VERSION_CODES.JELLY_BEAN) {
                btn.setBackgroundDrawable(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
            } else {
                btn.setBackground(ContextCompat.getDrawable(ctx, R.drawable.btn_rounded_darker));
            }
            btn.setTextColor(ctx.getResources().getColor(R.color.grey_60));
//            Typeface face = Typeface.createFromAsset(ctx.getAssets(),
//                    "fonts/tajawal_black.ttf");
            Typeface typeface = ResourcesCompat.getFont(ctx, R.font.tajwal_regular);
            btn.setTypeface(typeface);
            flex_show_time.addView(btn, params);
        }

    }



    private void setIsSender(boolean isSender) {
        final int color;
//        if (isSender) {
//            color = mGreen300;
//            mLeftArrow.setVisibility(View.GONE);
//            mRightArrow.setVisibility(View.VISIBLE);
//            mMessageContainer.setGravity(Gravity.END);
//        } else {
//            color = mGray300;
//            mLeftArrow.setVisibility(View.VISIBLE);
//            mRightArrow.setVisibility(View.GONE);
//            mMessageContainer.setGravity(Gravity.START);
//        }
//
//        ((GradientDrawable) mMessage.getBackground()).setColor(color);
//        ((RotateDrawable) mLeftArrow.getBackground()).getDrawable()
//                .setColorFilter(color, PorterDuff.Mode.SRC);
//        ((RotateDrawable) mRightArrow.getBackground()).getDrawable()
//                .setColorFilter(color, PorterDuff.Mode.SRC);
    }

    public interface OnItemClickListener {
        void onItemClick(View view, Episode obj, int position);
    }

    public interface OnLongItemClickListener {
        void onLongItemClick(View view, Episode obj, int position);
    }

    public void setOnItemClickListener(final OnItemClickListener mItemClickListener) {
        this.mOnItemClickListener = mItemClickListener;
    }

    public void setOnLongItemClickListener(final OnLongItemClickListener mItemLongClickListener) {
        this.mOnLongItemClickListener = mItemLongClickListener;
    }
}