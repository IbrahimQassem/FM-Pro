package com.sana.dev.fm.adapter;


import android.annotation.SuppressLint;
import android.content.Context;
import android.util.SparseBooleanArray;
import android.view.LayoutInflater;
import android.view.View;
import android.view.View.OnLongClickListener;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView.Adapter;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.List;

public class AdapterListInbox extends Adapter<AdapterListInbox.ViewHolder> {
    private Context ctx;
    private int current_selected_idx = -1;
    private List<Episode> items;
    private OnClickListener onClickListener = null;
    private SparseBooleanArray selected_items;

    public interface OnClickListener {
        void onItemClick(View view, Episode episode, int i);

        void onItemLongClick(View view, Episode episode, int i);
    }

    public class ViewHolder extends androidx.recyclerview.widget.RecyclerView.ViewHolder {
        public TextView date;
        public TextView email;
        public TextView from;
        public ImageView image;
        public TextView image_letter;
        public RelativeLayout lyt_checked;
        public RelativeLayout lyt_image;
        public View lyt_parent;
        public TextView message;

        public ViewHolder(View view) {
            super(view);
            this.from = (TextView) view.findViewById(R.id.from);
            this.email = (TextView) view.findViewById(R.id.email);
            this.message = (TextView) view.findViewById(R.id.message);
            this.date = (TextView) view.findViewById(R.id.tv_day_period);
            this.image_letter = (TextView) view.findViewById(R.id.image_letter);
            this.image = (ImageView) view.findViewById(R.id.civ_logo);
            this.lyt_checked = (RelativeLayout) view.findViewById(R.id.lyt_checked);
            this.lyt_image = (RelativeLayout) view.findViewById(R.id.lyt_image);
            this.lyt_parent = view.findViewById(R.id.lyt_parent);
        }
    }

    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public AdapterListInbox(Context context, List<Episode> list) {
        this.ctx = context;
        this.items = list;
        this.selected_items = new SparseBooleanArray();
    }

    public ViewHolder onCreateViewHolder(ViewGroup viewGroup, int i) {
        return new ViewHolder(LayoutInflater.from(viewGroup.getContext()).inflate(R.layout.item_inbox, viewGroup, false));
    }

    public void onBindViewHolder(ViewHolder viewHolder, @SuppressLint("RecyclerView") final int i) {
        final Episode inbox = (Episode) this.items.get(i);
        viewHolder.from.setText(inbox.getEpName());
        viewHolder.email.setText(inbox.getEpDesc());
        viewHolder.message.setText(inbox.getEpDesc());
//        viewHolder.date.setText(inbox.getBroadcastDateAt());
        viewHolder.image_letter.setText(inbox.getEpName().substring(0, 1));
        viewHolder.lyt_parent.setActivated(this.selected_items.get(i, false));
        viewHolder.lyt_parent.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (AdapterListInbox.this.onClickListener != null) {
                    AdapterListInbox.this.onClickListener.onItemClick(view, inbox, i);
                }
            }
        });

        viewHolder.date.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (AdapterListInbox.this.onClickListener != null) {
                    AdapterListInbox.this.onClickListener.onItemClick(view, inbox, i);
                }
            }
        });

        viewHolder.lyt_parent.setOnLongClickListener(new OnLongClickListener() {
            public boolean onLongClick(View view) {
                if (AdapterListInbox.this.onClickListener == null) {
                    return false;
                }
                AdapterListInbox.this.onClickListener.onItemLongClick(view, inbox, i);
                return true;
            }
        });
        toggleCheckedIcon(viewHolder, i);
        displayImage(viewHolder, inbox);
    }

    private void displayImage(ViewHolder viewHolder, Episode inbox) {
        if (inbox.getEpProfile() != null) {
            Tools.displayImageRound(this.ctx, viewHolder.image, inbox.getEpProfile());
            viewHolder.image.setColorFilter(null);
            viewHolder.image_letter.setVisibility(View.GONE);
            return;
        }
        viewHolder.image.setImageResource(R.drawable.shape_circle);
//        viewHolder.image.setColorFilter(inbox.color);
        viewHolder.image_letter.setVisibility(View.VISIBLE);
    }

    private void toggleCheckedIcon(ViewHolder viewHolder, int i) {
        if (this.selected_items.get(i, false)) {
            viewHolder.lyt_image.setVisibility(View.GONE);
            viewHolder.lyt_checked.setVisibility(View.VISIBLE);
            if (this.current_selected_idx == i) {
                resetCurrentIndex();
                return;
            }
            return;
        }
        viewHolder.lyt_checked.setVisibility(View.GONE);
        viewHolder.lyt_image.setVisibility(View.VISIBLE);
        if (this.current_selected_idx == i) {
            resetCurrentIndex();
        }
    }

    public Episode getItem(int i) {
        return (Episode) this.items.get(i);
    }

    public int getItemCount() {
        return this.items.size();
    }

    public void toggleSelection(int i) {
        this.current_selected_idx = i;
        if (this.selected_items.get(i, false)) {
            this.selected_items.delete(i);
        } else {
            this.selected_items.put(i, true);
        }
        notifyItemChanged(i);
    }

    public void clearSelections() {
        this.selected_items.clear();
        notifyDataSetChanged();
    }

    public int getSelectedItemCount() {
        return this.selected_items.size();
    }

    public List<Integer> getSelectedItems() {
        ArrayList arrayList = new ArrayList(this.selected_items.size());
        for (int i = 0; i < this.selected_items.size(); i++) {
            arrayList.add(Integer.valueOf(this.selected_items.keyAt(i)));
        }
        return arrayList;
    }

    public void removeData(int i) {
        this.items.remove(i);
        resetCurrentIndex();
    }

    private void resetCurrentIndex() {
        this.current_selected_idx = -1;
    }
}
