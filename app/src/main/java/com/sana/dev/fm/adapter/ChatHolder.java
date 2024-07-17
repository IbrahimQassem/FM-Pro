package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;
import static com.sana.dev.fm.utils.Tools.getFormattedTimeEvent;

import android.content.Context;
import android.view.View;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemGridBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.LogUtility;
import com.sana.dev.fm.utils.Tools;

import java.util.Collections;
import java.util.Map;


public class ChatHolder extends RecyclerView.ViewHolder {
    public static final String TAG = ChatHolder.class.getSimpleName();
    private Context ctx;
    private OnClickListener mOnItemClickListener;
    private OnItemLongClick mOnLongItemClickListener;
    private int position;

    private ItemGridBinding binding;

    public ChatHolder(ItemGridBinding binding) {
        super(binding.getRoot());
        this.binding = binding;
        this.ctx = binding.getRoot().getContext();
    }


    public void bind(@NonNull Episode mode, int position) {
        this.position = position;
        initBindViewHolder(mode);
//        FirebaseUser currentUser = FirebaseAuth.getInstance().getCurrentUser();
//        setIsSender(currentUser != null && chat.getUid().equals(currentUser.getUid()));

        binding.btMore.setVisibility(View.GONE);

        if ((BuildConfig.FLAVOR.equals("hudhudfm_google_play"))) {
            binding.lytCommentParent.setVisibility(View.GONE);
        }

    }


    private void initBindViewHolder(@Nullable Episode episode) {
//        if (episode.disabled()){
//            itemView.setVisibility(View.GONE);
//        }

        Tools.setTextOrHideIfEmpty(binding.tvTitle, episode.getEpName());
        Tools.setTextOrHideIfEmpty(binding.tvAnnouncer, episode.getEpAnnouncer());

        Tools.setTextOrHideIfEmpty(binding.tvDesc, episode.getEpDesc());
//        Tools.setTextOrHideIfEmpty(binding.tvState, null);
//        Tools.setTextOrHideIfEmpty(binding.tvDate, null);

        if (episode.getShowTimeList() != null && episode.getShowTimeList().size() > 0) {
            //        binding.tvTime.setText(Tools.getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList())));
            DateTimeModel dateTimeModel = episode.getShowTimeList().get(0);
            String st = "" + getFormattedTimeEvent(dateTimeModel.getTimeStart(), FmUtilize.arabicFormat);
            Tools.setTextOrHideIfEmpty(binding.tvTime, st);
        }

        if (episode.getProgramScheduleTime() != null) {
            String dt = getFormattedDateOnly(episode.getProgramScheduleTime().getDateStart(), FmUtilize.arabicFormat) + " - " + getFormattedDateOnly(episode.getProgramScheduleTime().getDateEnd(), FmUtilize.arabicFormat);
//            String dt = episode.getProgramScheduleTime().getDateStart() + " - " + episode.getProgramScheduleTime().getDateEnd();
            Tools.setTextOrHideIfEmpty(binding.tvDate, dt);
        }
//        try {
////            Tools.setTextOrHideIfEmpty(binding.tvTime, getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList()), FmUtilize.arabicFormat));
////            Tools.setTextOrHideIfEmpty(binding.tvDate, getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList()), FmUtilize.arabicFormat));
////        binding.tvTime.setText(Tools.getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList())));
////        String st = "" +  getFormattedTimeEvent(episode.getDateTimeModel().getTimeStart(), FmUtilize.arabicFormat);
////        binding.tvState.setText(st);
//            if (episode.getProgramScheduleTime() != null) {
//                String dt = getFormattedDateOnly(episode.getProgramScheduleTime().getDateStart(),FmUtilize.arabicFormat) + " - " + getFormattedDateOnly(episode.getProgramScheduleTime().getDateEnd(),FmUtilize.arabicFormat);
//                binding.tvDate.setText(dt);
//            } else {
////            binding.tvState.setVisibility(View.GONE);
//            }
//        }catch (Exception e){
//            e.printStackTrace();
//            LogUtility.d(TAG, "Error getProgramScheduleTime : " + e.getMessage());
//        }

//        if (episode.getDateTimeModel() != null){
//            LogUtility.d(TAG, "date  getDateStart : " + new Gson().toJson(FmUtilize.modifyDateLayout(episode.getDateTimeModel().getDateStart())));
//            LogUtility.d(TAG, "date  getDateEnd : " + new Gson().toJson(FmUtilize.modifyDateLayout(episode.getDateTimeModel().getDateEnd())));
//        }
//        tv_time.setText(Tools.getFormattedTimeEvent(DateTimeModel.findMainShowTime(episode.getShowTimeList())));
        Tools.displayImageRound(ctx, binding.civLogo, episode.getEpProfile());
        Tools.displayImageOriginal(ctx, binding.ivBanner, episode.getEpProfile());

        Map<String, Boolean> likeStates = episode.getEpisodeLikes();
        if (episode.userId != null) {
            for (Map.Entry<String, Boolean> pair : likeStates.entrySet()) {
//                    LogUtility.d("getEpisodeLikes", String.format("Key (name) is: %s, Value   is : %s", pair.getKey(), pair.getValue()));
                if (Boolean.TRUE.equals(likeStates.get(episode.userId))) {
                    episode.isLiked = pair.getValue();
                    binding.imvLike.setColorFilter(ContextCompat.getColor(ctx, R.color.colorPrimary));
                }
            }
        }

        int countLike = Collections.frequency(likeStates.values(), true);
        binding.txtLikes.setText(ctx.getResources().getQuantityString(
                R.plurals.likes_count, countLike, countLike
        ));

        binding.civLogo.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        binding.lytCommentParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });


        binding.lytParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        binding.lytParent.setOnLongClickListener(new View.OnLongClickListener() {
            @Override
            public boolean onLongClick(View v) {
                if (mOnLongItemClickListener != null) {
                    mOnLongItemClickListener.onItemLongClick(v, episode, position);
                }
                return false;
            }
        });

        binding.imvComment.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(view, episode, position);
                }
            }
        });

        binding.imvLike.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });
    }


    public void setOnItemClickListener(final OnClickListener mItemClickListener) {
        this.mOnItemClickListener = mItemClickListener;
    }

    public void setOnLongItemClickListener(final OnItemLongClick mItemLongClickListener) {
        this.mOnLongItemClickListener = mItemLongClickListener;
    }
}