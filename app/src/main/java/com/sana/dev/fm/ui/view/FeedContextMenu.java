package com.sana.dev.fm.ui.view;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.LinearLayout;

import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.FmUtilize;

import butterknife.ButterKnife;
import butterknife.OnClick;

/**
 * Created by froger_mcs on 15.12.14.
 */
public class FeedContextMenu extends LinearLayout {
    private static final int CONTEXT_MENU_WIDTH = FmUtilize.dpToPx(240);

    private int feedItem = -1;

    private OnFeedContextMenuItemClickListener onItemClickListener;

    public FeedContextMenu(Context context) {
        super(context);
        init();
    }

    private void init() {
        LayoutInflater.from(getContext()).inflate(R.layout.view_context_menu, this, true);
        setBackgroundResource(R.drawable.bg_container_shadow);
        setOrientation(VERTICAL);
        setLayoutParams(new LayoutParams(CONTEXT_MENU_WIDTH, ViewGroup.LayoutParams.WRAP_CONTENT));
    }

    public void bindToItem(int feedItem) {
        this.feedItem = feedItem;
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        ButterKnife.bind(this);
    }

    public void dismiss() {
        ((ViewGroup) getParent()).removeView(FeedContextMenu.this);
    }

    @OnClick(R.id.btnReport)
    public void onReportClick() {
        if (onItemClickListener != null) {
            onItemClickListener.onReportClick(feedItem);
        }
    }

    @OnClick(R.id.btnFavoritePhoto)
    public void onSharePhotoClick() {
        if (onItemClickListener != null) {
            onItemClickListener.onFavoritePhotoClick(feedItem);

        }
    }

    @OnClick(R.id.btnCopyShareUrl)
    public void onCopyShareUrlClick() {
        if (onItemClickListener != null) {
            onItemClickListener.onCopyShareUrlClick(feedItem);
        }
    }

    @OnClick(R.id.btnCancel)
    public void onCancelClick() {
        if (onItemClickListener != null) {
            onItemClickListener.onCancelClick(feedItem);
//            Toast.makeText(getContext(), "Hi", Toast.LENGTH_SHORT).show();
        }
    }

    public void setOnFeedMenuItemClickListener(OnFeedContextMenuItemClickListener onItemClickListener) {
        this.onItemClickListener = onItemClickListener;
    }

    public interface OnFeedContextMenuItemClickListener {
        void onReportClick(int feedItem);

        void onFavoritePhotoClick(int feedItem);

        void onCopyShareUrlClick(int feedItem);

        void onCancelClick(int feedItem);
    }
}