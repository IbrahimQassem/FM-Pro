package com.sana.dev.fm.adapter;


import static com.sana.dev.fm.utils.Tools.getFormattedDateOnly;
import static com.sana.dev.fm.utils.Tools.getFormattedTimeEvent;

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

import androidx.recyclerview.widget.RecyclerView;
import androidx.recyclerview.widget.RecyclerView.Adapter;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemInboxBinding;
import com.sana.dev.fm.databinding.ItemProgramsBinding;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.List;

public class AdapterListProgram extends Adapter<AdapterListProgram.MyViewHolder> {
    private Context ctx;
    private int current_selected_idx = -1;
    private List<RadioProgram> items;
    private OnClickListener onClickListener = null;
    private OnItemLongClick onLongClickListener = null;
    private SparseBooleanArray selected_items;


    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final ItemInboxBinding binding;

        public MyViewHolder(ItemInboxBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }
    public void setOnLongClickListener(OnItemLongClick onLongClickListener) {
        this.onLongClickListener = onLongClickListener;
    }

    public AdapterListProgram(Context context, List<RadioProgram> list) {
        this.ctx = context;
        this.items = list;
        this.selected_items = new SparseBooleanArray();
    }

    @Override
    public MyViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        ItemInboxBinding inflate = ItemInboxBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new MyViewHolder(inflate);
    }


    public void onBindViewHolder(MyViewHolder viewHolder, @SuppressLint("RecyclerView") final int i) {
        final RadioProgram model = (RadioProgram) this.items.get(i);
        viewHolder.binding.tvTitle.setText(model.getPrName());
//        viewHolder.binding.tvSubtitle.setText(model.getEpAnnouncer());
        viewHolder.binding.tvDesc.setText(model.getPrDesc());

        if (model.getProgramScheduleTime() != null) {
            String dt = ctx.getString(R.string.label_date_from_to, getFormattedDateOnly(model.getProgramScheduleTime().getDateStart(), FmUtilize.arabicFormat), getFormattedDateOnly(model.getProgramScheduleTime().getDateEnd(), FmUtilize.arabicFormat));
            viewHolder.binding.tvDate.setText(dt);
        } else {
//            binding.tvState.setVisibility(View.GONE);
        }

        viewHolder.binding.imageLetter.setText(model.getPrName().substring(0, 1));
        viewHolder.binding.lytParent.setActivated(this.selected_items.get(i, false));

        viewHolder.binding.lytParent.setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                if (onClickListener != null) {
                    onClickListener.onItemClick(view, model, i);
                }
            }
        });

        viewHolder.binding.lytParent.setOnLongClickListener(new OnLongClickListener() {
            public boolean onLongClick(View view) {
                if (onLongClickListener == null) {
                    return false;
                }
                onLongClickListener.onItemLongClick(view, model, i);
                return true;
            }
        });

        toggleCheckedIcon(viewHolder, i);
        displayImage(viewHolder, model);
    }

    private void displayImage(MyViewHolder viewHolder, RadioProgram inbox) {
        if (inbox.getPrProfile() != null) {
            Tools.displayImageRound(this.ctx, viewHolder.binding.image, inbox.getPrProfile());
            viewHolder.binding.image.setColorFilter(null);
            viewHolder.binding.imageLetter.setVisibility(View.GONE);
            return;
        }
        viewHolder.binding.image.setImageResource(R.drawable.shape_circle);
//        viewHolder.image.setColorFilter(inbox.color);
        viewHolder.binding.imageLetter.setVisibility(View.VISIBLE);
    }

    private void toggleCheckedIcon(MyViewHolder viewHolder, int i) {
        if (this.selected_items.get(i, false)) {
            viewHolder.binding.lytImage.setVisibility(View.GONE);
            viewHolder.binding.lytChecked.setVisibility(View.VISIBLE);
            if (this.current_selected_idx == i) {
                resetCurrentIndex();
                return;
            }
            return;
        }
        viewHolder.binding.lytChecked.setVisibility(View.GONE);
        viewHolder.binding.lytImage.setVisibility(View.VISIBLE);
        if (this.current_selected_idx == i) {
            resetCurrentIndex();
        }
    }

    public RadioProgram getItem(int i) {
        return (RadioProgram) this.items.get(i);
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
