package com.sana.dev.fm.adapter;

import android.annotation.SuppressLint;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.mikhaellopez.circularimageview.CircularImageView;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.ui.activity.MainActivity;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.UserGuide;


import java.util.ArrayList;

import co.mobiwise.materialintro.animation.MaterialIntroListener;
import co.mobiwise.materialintro.shape.Focus;
import co.mobiwise.materialintro.shape.ShapeType;

public class RadiosAdapter extends RecyclerView.Adapter<RadiosAdapter.ViewHolder> {


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

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.radios_item, parent, false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, @SuppressLint("RecyclerView") int position) {

        RadioInfo model = list.get(position);
//        RadioInfo d = RadioInfo.getSelectedRadio(context);

        holder.title.setText(model.getName());
        holder.tvFreq.setText(model.getChannelFreq());
//        holder.title.setText(model.getName() +" : "+ (model.isActive() ? "active" : "inactive"));
        Tools.displayImageOriginal(context, holder.image, model.getLogo());

        holder.itemView.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (onClickListener != null) {
                    onClickListener.onItemClick(v, model, position);
                }
            }
        });

        if (selectedItem == position) {
            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.pink_100));
        } else {
            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.white));
        }

//        if ( d.getRadioId().equals(model.getRadioId())) {
//            holder.cardView.setCardBackgroundColor(context.getResources().getColor(R.color.pink_100));
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

//        notifyDataSetChanged();
        notifyItemChanged(previousItem);
        notifyItemChanged(pos);


//        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
//            @Override
//            public void run() {
//                // Your Code
        recyclerView.smoothScrollToPosition(pos);
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

    public class ViewHolder extends RecyclerView.ViewHolder {

        //        ImageView image;
        CircularImageView image;
        TextView title, tvFreq;
        CardView cardView;

        public ViewHolder(@NonNull View itemView) {
            super(itemView);

            title = itemView.findViewById(R.id.tvTitle);
            tvFreq = itemView.findViewById(R.id.tvFreq);
            image = itemView.findViewById(R.id.image);
            cardView = itemView.findViewById(R.id.cardView);

        }
    }


}