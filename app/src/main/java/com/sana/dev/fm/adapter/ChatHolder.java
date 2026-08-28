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
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;


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
        binding.lytCommentParent.setVisibility(View.VISIBLE);
        binding.lytShareParent.setVisibility(View.VISIBLE);

    }


    private void initBindViewHolder(@Nullable Episode episode) {
        if (episode == null) return;

        com.sana.dev.fm.model.RadioInfo selectedRadio = PreferencesManager.getInstance() != null ? PreferencesManager.getInstance().selectedRadio() : null;

        String title = episode.getEpName();
        if (Tools.isEmpty(title)) {
            title = episode.getProgramName();
        }
        if (Tools.isEmpty(title) && selectedRadio != null && !Tools.isEmpty(selectedRadio.getName())) {
            title = selectedRadio.getName();
        }
        if (Tools.isEmpty(title)) {
            title = ctx.getString(R.string.label_program_name);
        }
        binding.tvTitle.setVisibility(View.VISIBLE);
        binding.tvTitle.setText(title);

        String announcer = episode.getEpAnnouncer();
        if (Tools.isEmpty(announcer) && selectedRadio != null && !Tools.isEmpty(selectedRadio.getChannelFreq())) {
            announcer = selectedRadio.getChannelFreq();
        }
        if (Tools.isEmpty(announcer) && selectedRadio != null && !Tools.isEmpty(selectedRadio.getCity())) {
            announcer = selectedRadio.getCity();
        }
        if (Tools.isEmpty(announcer)) {
            announcer = ctx.getString(R.string.label_announcer_name);
        }
        binding.tvAnnouncer.setVisibility(View.VISIBLE);
        binding.tvAnnouncer.setText(announcer);

        Tools.setTextOrHideIfEmpty(binding.tvDesc, episode.getEpDesc());

        if (episode.getShowTimeList() != null && !episode.getShowTimeList().isEmpty()) {
            DateTimeModel dateTimeModel = episode.getShowTimeList().get(0);
            if (dateTimeModel != null && dateTimeModel.getTimeStart() > 0) {
                String st = "" + getFormattedTimeEvent(dateTimeModel.getTimeStart(), FmUtilize.arabicFormat);
                Tools.setTextOrHideIfEmpty(binding.tvTime, st);
            } else {
                binding.tvTime.setVisibility(View.VISIBLE);
                binding.tvTime.setText(ctx.getString(R.string.state_live_stream));
            }
        } else {
            binding.tvTime.setVisibility(View.VISIBLE);
            binding.tvTime.setText(ctx.getString(R.string.state_live_stream));
        }

        if (episode.getProgramScheduleTime() != null
                && episode.getProgramScheduleTime().getDateStart() > 0
                && episode.getProgramScheduleTime().getDateEnd() > 0) {
            String dt = getFormattedDateOnly(episode.getProgramScheduleTime().getDateStart(), FmUtilize.arabicFormat) + " - " + getFormattedDateOnly(episode.getProgramScheduleTime().getDateEnd(), FmUtilize.arabicFormat);
            Tools.setTextOrHideIfEmpty(binding.tvDate, dt);
        } else {
            binding.tvDate.setVisibility(View.GONE);
        }

        String profileUrl = episode.getEpProfile();
        if (Tools.isEmpty(profileUrl) && selectedRadio != null && !Tools.isEmpty(selectedRadio.getLogo())) {
            profileUrl = selectedRadio.getLogo();
        }
        Tools.displayImageRound(ctx, binding.civLogo, profileUrl);
        Tools.displayImageOriginal(ctx, binding.ivBanner, profileUrl);


        String currentUserId = null;
        try {
            if (PreferencesManager.getInstance() != null && PreferencesManager.getInstance().getUserSession() != null) {
                currentUserId = PreferencesManager.getInstance().getUserSession().getUserId();
            }
        } catch (Exception ignored) {
        }

        boolean isLikedBy = currentUserId != null && episode.isLikedBy(currentUserId);
        episode.isLiked = isLikedBy;

        if (isLikedBy) {
            binding.imvLike.setImageResource(R.drawable.ic_thumb_up);
            binding.imvLike.setColorFilter(ContextCompat.getColor(ctx, R.color.md_theme_primary));
            binding.txtLikes.setTextColor(ContextCompat.getColor(ctx, R.color.md_theme_primary));
        } else {
            binding.imvLike.setImageResource(R.drawable.ic_thumb_up);
            binding.imvLike.setColorFilter(ContextCompat.getColor(ctx, R.color.md_theme_onSurfaceVariant));
            binding.txtLikes.setTextColor(ContextCompat.getColor(ctx, R.color.md_theme_onSurfaceVariant));
        }

        int countLike = episode.getLikesCount();
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

        binding.lytLikeParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(binding.imvLike, episode, position);
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

        binding.lytShareParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        binding.imvShare.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mOnItemClickListener != null) {
                    mOnItemClickListener.onItemClick(v, episode, position);
                }
            }
        });

        binding.btMore.setOnClickListener(new View.OnClickListener() {
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