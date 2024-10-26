package com.sana.dev.fm.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.RatingBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.DestinationModel;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.List;

public class DestinationSliderAdapter extends RecyclerView.Adapter<DestinationSliderAdapter.SliderViewHolder> {
    private List<DestinationModel> destinations;
    private Context context;
    private OnDestinationClickListener listener;

    public interface OnDestinationClickListener {
        void onDestinationClick(DestinationModel destination);
        void onFavoriteClick(DestinationModel destination);
    }

    public DestinationSliderAdapter(Context context, OnDestinationClickListener listener) {
        this.context = context;
        this.listener = listener;
        this.destinations = new ArrayList<>();
    }

    @NonNull
    @Override
    public SliderViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(context).inflate(R.layout.item_destination_slider, parent, false);
        return new SliderViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull SliderViewHolder holder, int position) {
        DestinationModel destination = destinations.get(position);
        holder.bind(destination);
    }

    @Override
    public int getItemCount() {
        return destinations != null ? destinations.size() : 0;
    }

    public void setDestinations(List<DestinationModel> destinations) {
        this.destinations = destinations;
        notifyDataSetChanged();
    }

    class SliderViewHolder extends RecyclerView.ViewHolder {
        ImageView destinationImage;
        TextView destinationName;
        RatingBar ratingBar;
        ImageButton favoriteButton;

        SliderViewHolder(@NonNull View itemView) {
            super(itemView);
            destinationImage = itemView.findViewById(R.id.destinationImage);
            destinationName = itemView.findViewById(R.id.destinationName);
            ratingBar = itemView.findViewById(R.id.ratingBar);
            favoriteButton = itemView.findViewById(R.id.favoriteButton);

            itemView.setOnClickListener(v -> {
                int position = getAdapterPosition();
                if (position != RecyclerView.NO_POSITION) {
                    listener.onDestinationClick(destinations.get(position));
                }
            });

            favoriteButton.setOnClickListener(v -> {
                int position = getAdapterPosition();
                if (position != RecyclerView.NO_POSITION) {
                    listener.onFavoriteClick(destinations.get(position));
                }
            });
        }

        void bind(DestinationModel destination) {
            destinationName.setText(destination.getName());
            ratingBar.setRating(destination.getRating());


            Tools.displayImageOriginal(context, destinationImage, destination.getImageUrl());

////            // Load image using Glide
//            Glide.with(itemView.getContext())
//                    .load(destination.getImageUrl())
//                    .transform(new RoundedCorners(32))
//                    .transition(DrawableTransitionOptions.withCrossFade())
//                    .into(destinationImage);
        }
    }
}