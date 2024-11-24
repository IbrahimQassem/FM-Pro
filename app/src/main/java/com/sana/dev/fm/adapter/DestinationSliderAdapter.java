package com.sana.dev.fm.adapter;

import static android.view.View.VISIBLE;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.databinding.ItemDestinationSliderBinding;
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
    public SliderViewHolder onCreateViewHolder(ViewGroup parent, int type) {
        ItemDestinationSliderBinding inflate = ItemDestinationSliderBinding.inflate(LayoutInflater.from(parent.getContext()), parent, false);
        return new SliderViewHolder(inflate);
    }


    @Override
    public void onBindViewHolder(@NonNull SliderViewHolder viewHolder, int position) {
        if (viewHolder instanceof SliderViewHolder) {
            SliderViewHolder holder = (SliderViewHolder) viewHolder;
            holder.setIsRecyclable(false);

            DestinationModel item = destinations.get(position);

            holder.binding.tvName.setText(item.getName());
            holder.binding.tvDesc.setText(item.getSubTitle());
            holder.binding.ratingBar.setRating(item.getRating());

            Tools.displayImageOriginal(context, holder.binding.destinationImage, item.getImageUrl());

            holder.binding.favoriteButton.setVisibility(!Tools.isEmpty(item.getWebUrl()) ? VISIBLE : View.GONE);

//////            // Load image using Glide
//            Glide.with(context)
//                    .load(item.getImageUrl())
//                    .transform(new RoundedCorners(32))
//                    .transition(DrawableTransitionOptions.withCrossFade())
//                    .into(holder.binding.destinationImage);

            holder.itemView.setOnClickListener(v -> {
                if (position != RecyclerView.NO_POSITION) {
                    listener.onDestinationClick(destinations.get(position));
                }
            });

            holder.binding.favoriteButton.setOnClickListener(v -> {
                if (position != RecyclerView.NO_POSITION) {
                    listener.onFavoriteClick(destinations.get(position));
                }
            });
        }
    }


    @Override
    public int getItemCount() {
        return destinations != null ? destinations.size() : 0;
    }

    public void setDestinations(List<DestinationModel> destinations) {
        this.destinations = destinations;
        notifyDataSetChanged();
    }

    public class SliderViewHolder extends RecyclerView.ViewHolder {
        private final ItemDestinationSliderBinding binding;
        public SliderViewHolder(ItemDestinationSliderBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }
    }

/*
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
*/
}