package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import androidx.core.view.MotionEventCompat;
import androidx.recyclerview.widget.RecyclerView;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;


import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemDragBinding;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.utils.DragItemTouchHelper;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AdapterListDrag extends RecyclerView.Adapter<RecyclerView.ViewHolder> implements DragItemTouchHelper.MoveHelperAdapter {

    private List<RadioInfo> items = new ArrayList<>();

    private Context ctx;
    private OnClickListener onClickListener = null;
    private OnStartDragListener mDragStartListener = null;

    public interface OnStartDragListener {
        void onStartDrag(RecyclerView.ViewHolder viewHolder, RadioInfo obj, int position);
    }


    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public AdapterListDrag(Context context, List<RadioInfo> items) {
        this.items = items;
        ctx = context;
    }

    public void setDragListener(OnStartDragListener dragStartListener) {
        this.mDragStartListener = dragStartListener;
    }

    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        RecyclerView.ViewHolder vh;
        ItemDragBinding inflate = ItemDragBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        vh = new OriginalViewHolder(inflate);
        return vh;
    }



    public class OriginalViewHolder extends RecyclerView.ViewHolder implements DragItemTouchHelper.TouchViewHolder {
        private final ItemDragBinding binding;

        public OriginalViewHolder(ItemDragBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        @Override
        public void onItemSelected() {
            itemView.setBackgroundColor(ctx.getResources().getColor(R.color.grey_5));
        }

        @Override
        public void onItemClear() {
            itemView.setBackgroundColor(0);
        }
    }



    // Replace the contents of a view (invoked by the layout manager)
    @Override
    public void onBindViewHolder(final RecyclerView.ViewHolder holder, @SuppressLint("RecyclerView") final int position) {
        if (holder instanceof OriginalViewHolder) {
            final OriginalViewHolder view = (OriginalViewHolder) holder;

            final RadioInfo p = items.get(position);
            view.binding.tvTitle.setText(p.getName()+" - "+p.getRadioId());
            view.binding.tvDesc.setText(p.getChannelFreq() + "\n"+ p.getDesc() + "\n" + FmUtilize.stringToDate(p.getCreateAt()));
            view.binding.tvPriority.setText(ctx.getString(R.string.label_priority,p.getPriority()));
            view.binding.tvDate.setText(String.valueOf(position + 1));
            Tools.displayImageOriginal(ctx, view.binding.image, p.getLogo());


            view.binding.lytParent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View view) {
                    if (onClickListener != null) {
                        onClickListener.onItemClick(view, (RadioInfo) p , position);
                    }
                }
            });

            // Start a drag whenever the handle view it touched
            view.binding.btMove.setOnTouchListener(new View.OnTouchListener() {
                @SuppressLint("ClickableViewAccessibility")
                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (MotionEventCompat.getActionMasked(event) == MotionEvent.ACTION_DOWN && mDragStartListener != null) {
                        mDragStartListener.onStartDrag(holder,p,position);
                    }
                    return false;
                }
            });

        }
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    @Override
    public boolean onItemMove(int fromPosition, int toPosition) {
        Collections.swap(items, fromPosition, toPosition);
        notifyItemMoved(fromPosition, toPosition);
        return true;
    }

}