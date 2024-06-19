package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.Interpolator;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.utils.Tools;

import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;

/**
 * Created by admin on 20.01.15.
 */
public class ProgramDetailsAdapter extends RecyclerView.Adapter<ProgramDetailsAdapter.PhotoViewHolder> {
    private static final int PHOTO_ANIMATION_DELAY = 600;
    private static final Interpolator INTERPOLATOR = new DecelerateInterpolator();
    public static final int SPAN_COUNT_ONE = 1;
    public static final int SPAN_COUNT_THREE = 2;

    private static final int VIEW_TYPE_SMALL = 1;
    private static final int VIEW_TYPE_BIG = 2;
    private final Context context;
    private List<Episode> detailsList;
    private boolean lockedAnimations = false;
    private int lastAnimatedItem = -1;
    private GridLayoutManager mLayoutManager;

    private OnClickListener onClickListener = null;
    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public ProgramDetailsAdapter(Context context, List<Episode> items, GridLayoutManager layoutManager) {
        this.context = context;
        this.detailsList = items;
        mLayoutManager = layoutManager;
    }


    @Override
    public int getItemViewType(int position) {
        int spanCount = mLayoutManager.getSpanCount();
        if (spanCount == SPAN_COUNT_ONE) {
            return VIEW_TYPE_BIG;
        } else {
            return VIEW_TYPE_SMALL;
        }
    }

    @Override
    public int getItemCount() {
        if (detailsList != null) {
            return detailsList.size();
        } else {
            return 0;
        }
    }

    @Override
    public PhotoViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View view;
        if (viewType == VIEW_TYPE_BIG) {
            view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_big, parent, false);
        } else {
            view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_small, parent, false);
        }
        return new PhotoViewHolder(view, viewType);
    }


    @Override
    public void onBindViewHolder(PhotoViewHolder holder, @SuppressLint("RecyclerView") int position) {
        Episode item = detailsList.get(position % 4);
        holder.tvName.setText(item.getEpName());
        String imgUrl = item.getEpProfile();
        Tools.displayImageOriginal(context, holder.ivPhoto, imgUrl);
        if (getItemViewType(position) == VIEW_TYPE_BIG) {
            holder.tvDesc.setText(item.getEpDesc());
        }

        animatePhoto(holder);
        if (lastAnimatedItem < position) lastAnimatedItem = position;


        holder.itemView.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (onClickListener != null) {
                   onClickListener.onItemClick(view, (Episode) item , position);
                }
            }
        });
    }

    private void animatePhoto(PhotoViewHolder viewHolder) {
        if (!lockedAnimations) {
            if (lastAnimatedItem == viewHolder.getPosition()) {
                setLockedAnimations(true);
            }

//            long animationDelay = PHOTO_ANIMATION_DELAY + viewHolder.getPosition() * 30;
//
//            viewHolder.flRoot.setScaleY(0);
//            viewHolder.flRoot.setScaleX(0);
//
//            viewHolder.flRoot.animate()
//                    .scaleY(1)
//                    .scaleX(1)
//                    .setDuration(200)
//                    .setInterpolator(INTERPOLATOR)
//                    .setStartDelay(animationDelay)
//                    .start();
        }
    }


    static class PhotoViewHolder extends RecyclerView.ViewHolder {
        @BindView(R.id.flRoot)
        View flRoot;
        @BindView(R.id.ivPhoto)
        ImageView ivPhoto;
        @BindView(R.id.tvName)
        TextView tvName;
        @BindView(R.id.tvDesc)
        TextView tvDesc;

        public PhotoViewHolder(View view, int viewType) {
            super(view);
            ButterKnife.bind(this, view);
        }
    }

    public void setLockedAnimations(boolean lockedAnimations) {
        this.lockedAnimations = lockedAnimations;
    }


}
