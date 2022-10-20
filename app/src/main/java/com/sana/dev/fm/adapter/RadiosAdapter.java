package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.RadiosItemBinding;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.UserGuide;


import java.util.ArrayList;

public class RadiosAdapter extends RecyclerView.Adapter<RadiosAdapter.MyViewHolder> {


    Context context;
    ArrayList<RadioInfo> list;
    RecyclerView recyclerView;
    private OnClickListener onClickListener = null;
    private int selectedItem = -1;
    protected UserGuide userGuide;


    public RadiosAdapter(Context context, ArrayList<RadioInfo> list, RecyclerView recyclerView, int selectedItem) {
        this.context = context;
        this.list = list;
        this.recyclerView = recyclerView;
        this.selectedItem = selectedItem;
        userGuide = new UserGuide(context);

    }

    @Override
    public MyViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        RadiosItemBinding inflate = RadiosItemBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new RadiosAdapter.MyViewHolder(inflate);
    }

    public static class MyViewHolder extends RecyclerView.ViewHolder {
        private final RadiosItemBinding binding;

        public MyViewHolder(RadiosItemBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    @Override
    public void onBindViewHolder(MyViewHolder holder, @SuppressLint("RecyclerView") final int position) {

        RadioInfo model = list.get(position);

        holder.binding.tvTitle.setText(model.getName());
        holder.binding.tvFreq.setText(model.getChannelFreq());
//        holder.title.setText(model.getName() +" : "+ (model.isActive() ? "active" : "inactive"));
        Tools.displayImageOriginal(context, holder.binding.civLogo, model.getLogo());

        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (onClickListener != null) {
                    onClickListener.onItemClick(v, model, position);
                }
            }
        });

        if (selectedItem == position) {
            holder.binding.cvParent.setCardBackgroundColor(context.getResources().getColor(R.color.colorAccentLight));
        } else {
            holder.binding.cvParent.setCardBackgroundColor(context.getResources().getColor(R.color.white));
        }

//        if ( d.getRadioId().equals(model.getRadioId())) {
//            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.colorAccentLight));
//        }else {
//            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.white));
//        }


        // Highlight the item if it's selected
//        holder.selectedOverlay.setVisibility(isSelected(position) ? View.VISIBLE : View.INVISIBLE);


    }


    @Override
    public int getItemCount() {
        return list.size();
    }

    public void selectTaskListItem(int pos) {
        int previousItem = selectedItem;
        selectedItem = pos;
        notifyItemChanged(previousItem);
        notifyItemChanged(pos);
        recyclerView.smoothScrollToPosition(pos);


//        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
//            @Override
//            public void run() {
//                // Your Code
//        recyclerView.smoothScrollToPosition(pos);
//            }
//        }, 200);


    }


    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public interface OnClickListener {
        void onItemClick(View view, RadioInfo radioInfo, int i);

        void onItemLongClick(View view, RadioInfo radioInfo, int i);
    }


}