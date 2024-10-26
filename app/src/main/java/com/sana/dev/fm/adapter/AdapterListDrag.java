package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;

import androidx.core.content.ContextCompat;
import androidx.core.view.MotionEventCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.google.firebase.firestore.FirebaseFirestore;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemDragBinding;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.model.interfaces.OnCheckedChangeListener;
import com.sana.dev.fm.model.interfaces.OnClickListener;
import com.sana.dev.fm.model.interfaces.OnItemLongClick;
import com.sana.dev.fm.utils.DragItemTouchHelper;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class AdapterListDrag extends RecyclerView.Adapter<RecyclerView.ViewHolder> implements DragItemTouchHelper.MoveHelperAdapter {

    private List<RadioInfo> items = new ArrayList<>();
    private FirebaseFirestore db;
    private final Context ctx;
    private OnClickListener onClickListener = null;
    private OnItemLongClick onLongClickListener = null;
    private OnStartDragListener mDragStartListener = null;
    private OnCheckedChangeListener mCheckedChangeListener = null;

    public interface OnStartDragListener {
        void onStartDrag(RecyclerView.ViewHolder viewHolder, RadioInfo obj, int position);
    }


    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }
    public void setOnLongClickListener(OnItemLongClick onLongClickListener) {
        this.onLongClickListener = onLongClickListener;
    }

    public void setOnOnCheckedChangeListener(OnCheckedChangeListener mCheckedChangeListener) {
        this.mCheckedChangeListener = mCheckedChangeListener;
    }

    public AdapterListDrag(Context context, List<RadioInfo> items) {
        this.items = items;
        ctx = context;
        this.db = FirebaseFirestore.getInstance();
    }

    public void setDragListener(OnStartDragListener dragStartListener) {
        this.mDragStartListener = dragStartListener;
    }

    public void setNewList(List<RadioInfo> radioInfoList) {
        this.items = radioInfoList;
        notifyDataSetChanged();
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

            final RadioInfo model = items.get(position);
            view.binding.tvTitle.setText(model.getName()+" - "+model.getRadioId());
            Tools.setTextOrHideIfEmpty( view.binding.tvDesc, /*model.getChannelFreq() + "\n"+*/ model.getDesc() + "\n" + FmUtilize.stringToDate(model.getCreateAt()));
            view.binding.tvPriority.setText(model.getChannelFreq());
            view.binding.priorityText.setText(ctx.getString(R.string.label_priority,model.getPriority()));
            view.binding.tvDate.setText(ctx.getString(R.string.label_index)+ (position + 1));
            Tools.displayImageOriginal(ctx, view.binding.image, model.getLogo());

            int colorState = !model.isDisabled() ? R.color.green_500 : R.color.red_500;
            view.binding.ivInternet.setVisibility(View.VISIBLE);
            view.binding.ivInternet.setColorFilter(ContextCompat.getColor(ctx, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);

            // Set initial switch state
            view.binding.disableSwitch.setChecked(!model.isDisabled());

            // Set switch listener
            view.binding.disableSwitch.setOnCheckedChangeListener(null); // Clear previous listener
            view.binding.disableSwitch.setChecked(model.isDisabled());
            view.binding.disableSwitch.setOnCheckedChangeListener((buttonView, isChecked) -> {
                if (buttonView.isPressed()) { // Only proceed if user actually clicked
                    if (mCheckedChangeListener != null) {
                        mCheckedChangeListener.onCheckedChanged(buttonView, (RadioInfo) model ,isChecked, position);
                    }
                }
            });
//            view.binding.increasePriorityBtn.setOnClickListener(v -> updatePriority(destination, true));
//            view.binding.decreasePriorityBtn.setOnClickListener(v -> updatePriority(destination, false));
//            view.binding.lytParent.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    if (onClickListener != null) {
//                        onClickListener.onItemClick(v, (RadioInfo) model , position);
//                    }
//                }
//            });

            view.binding.increasePriorityBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (onClickListener != null) {
                        onClickListener.onItemClick(v, (RadioInfo) model , position);
                    }
                }
            });

            view.binding.decreasePriorityBtn.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (onClickListener != null) {
                        onClickListener.onItemClick(v, (RadioInfo) model , position);
                    }
                }
            });

            view.binding.lytParent.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    if (onLongClickListener == null) {
                        return false;
                    }
                    onLongClickListener.onItemLongClick(v, model, position);
                    return true;                }
            });

            // Start a drag whenever the handle view it touched
            view.binding.btMove.setOnTouchListener(new View.OnTouchListener() {
                @SuppressLint("ClickableViewAccessibility")
                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (MotionEventCompat.getActionMasked(event) == MotionEvent.ACTION_DOWN && mDragStartListener != null) {
                        mDragStartListener.onStartDrag(holder,model,position);
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
        notifyDataSetChanged();
        return true;
    }
}