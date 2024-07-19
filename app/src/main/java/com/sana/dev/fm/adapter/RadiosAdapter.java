package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemRadioSelectBinding;
import com.sana.dev.fm.databinding.RadiosItemBinding;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.UserGuide;

import java.util.ArrayList;

public class RadiosAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {
    Context context;
    ArrayList<RadioInfo> list;
    RecyclerView recyclerView;
    private OnClickListener onClickListener = null;
    private int selectedItem = -1;
    private int adapterView = -1;
    protected UserGuide userGuide;
    public static final int VIEW_TYPE_MAIN = 1;
    public static final int VIEW_TYPE_DIALOG = 2;

    public RadiosAdapter(int adapterView, Context context, ArrayList<RadioInfo> list, RecyclerView recyclerView, int selectedItem) {
        this.adapterView = adapterView;
        this.context = context;
        this.list = list;
        this.recyclerView = recyclerView;
        this.selectedItem = selectedItem;
        userGuide = new UserGuide(context);
    }

//    @Override
//    public MainViewHolder onCreateViewHolder(ViewGroup parent, int type) {
//        RadiosItemBinding inflate = RadiosItemBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
//        return new MainViewHolder(inflate);
//    }


    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        RecyclerView.ViewHolder vh;
        if (adapterView == VIEW_TYPE_DIALOG) {
            ItemRadioSelectBinding inflate = ItemRadioSelectBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
            vh = new DialogViewHolder(inflate);
        } else {
            RadiosItemBinding inflate = RadiosItemBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
            vh = new MainViewHolder(inflate);
        }
        return vh;
    }

    public static class MainViewHolder extends RecyclerView.ViewHolder {
        private final RadiosItemBinding binding;

        public MainViewHolder(RadiosItemBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    public static class DialogViewHolder extends RecyclerView.ViewHolder {
        private final ItemRadioSelectBinding binding;

        public DialogViewHolder(ItemRadioSelectBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

    @Override
    public void onBindViewHolder(final RecyclerView.ViewHolder viewHolder, @SuppressLint("RecyclerView") final int position) {
        RadioInfo model = list.get(position);

        if (viewHolder instanceof MainViewHolder) {
            final MainViewHolder holder = (MainViewHolder) viewHolder;
            holder.binding.tvTitle.setText(model.getName());
            holder.binding.tvFreq.setText(model.getChannelFreq());
//        holder.title.setText(model.getName() +" : "+ (model.isActive() ? "active" : "inactive"));
            Tools.displayImageOriginal(context, holder.binding.civLogo, model.getLogo());

            if (model.isBlueBadge()){
                holder.binding.ivBadgeImage.setVisibility(View.VISIBLE);
            }else {
                holder.binding.ivBadgeImage.setVisibility(View.GONE);
            }

            holder.binding.ivInternet.setVisibility(View.GONE);
////        boolean isInternetAvailable = Helper.isOnline(context);
//        boolean isInternetAvailable = Helper.isInternetUrlConnected(context,model.getStreamUrl());
//        if (isInternetAvailable) {
//           // new Helper.CheckStreamTask().execute(model.getStreamUrl());
////            Thread thread = new Thread(new Runnable() {
////                @Override
////                public void run() {
////                    try {
////                        // Your code goes here
////                        boolean isOnlineTxt = Helper.checkIfRadioOnline(model.getStreamUrl());
////                        int colorState = isOnlineTxt ? R.color.green_500 : R.color.yellow_500;
////                        holder.binding.ivInternet.setColorFilter(ContextCompat.getColor(context, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);
////                    } catch (Exception e) {
////                        e.printStackTrace();
////                    }
////                }
////            });
////            thread.start();
//            int colorState = isInternetAvailable ? R.color.green_500 : R.color.yellow_500;
//            holder.binding.ivInternet.setVisibility(View.VISIBLE);
//            holder.binding.ivInternet.setColorFilter(ContextCompat.getColor(context, colorState), android.graphics.PorterDuff.Mode.MULTIPLY);
//
//        } else {
//            holder.binding.ivInternet.setColorFilter(ContextCompat.getColor(context, R.color.yellow_500), android.graphics.PorterDuff.Mode.MULTIPLY);
//        }

            holder.itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (onClickListener != null) {
                        onClickListener.onItemClick(v, model, position);
                    }
                }
            });

            if (selectedItem == position) {
                holder.binding.cvParent.setCardBackgroundColor(context.getResources().getColor(R.color.colorAccent));
            } else {
                holder.binding.cvParent.setCardBackgroundColor(context.getResources().getColor(R.color.white));
            }

//        if ( d.getRadioId().equals(model.getRadioId())) {
//            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.colorPrimaryLight));
//        }else {
//            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.white));
//        }


            // Highlight the item if it's selected
//        holder.selectedOverlay.setVisibility(isSelected(position) ? View.VISIBLE : View.INVISIBLE);


        } else if (viewHolder instanceof DialogViewHolder) {
            final DialogViewHolder holder = (DialogViewHolder) viewHolder;
            holder.binding.tvTitle.setText(model.getName());
            Tools.displayImageOriginal(context, holder.binding.civLogo, model.getLogo());
            holder.itemView.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (onClickListener != null) {
                        onClickListener.onItemClick(v, model, position);
                    }
                }
            });
        }
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
    }


    public void setOnClickListener(OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }

    public interface OnClickListener {
        void onItemClick(View view, RadioInfo model, int position);

        void onItemLongClick(View view, RadioInfo model, int position);
    }


}