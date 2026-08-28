package com.sana.dev.fm.adapter;

import android.content.Context;
import android.text.TextUtils;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemStationGridBinding;
import com.sana.dev.fm.databinding.ItemStationListBinding;
import com.sana.dev.fm.model.RadioInfo;
import com.sana.dev.fm.utils.Tools;

import java.util.ArrayList;
import java.util.List;

/**
 * Modern Material 3 Station Adapter with Grid and List view modes, filtering, and quick play support.
 */
public class StationGridAdapter extends RecyclerView.Adapter<RecyclerView.ViewHolder> {

    public static final int VIEW_TYPE_GRID = 1;
    public static final int VIEW_TYPE_LIST = 2;

    public interface OnStationActionListener {
        void onStationClick(@NonNull RadioInfo station, int position);
        void onQuickPlayClick(@NonNull RadioInfo station, int position);
    }

    private final Context context;
    private final List<RadioInfo> originalList = new ArrayList<>();
    private final List<RadioInfo> filteredList = new ArrayList<>();
    private OnStationActionListener listener;
    private String currentPlayingStreamUrl = null;
    private int currentViewType = VIEW_TYPE_GRID;

    public StationGridAdapter(@NonNull Context context, @NonNull List<RadioInfo> stations) {
        this.context = context;
        this.originalList.addAll(stations);
        this.filteredList.addAll(stations);
    }

    public void setListener(@Nullable OnStationActionListener listener) {
        this.listener = listener;
    }

    public void setViewType(int viewType) {
        if (this.currentViewType != viewType) {
            this.currentViewType = viewType;
            notifyDataSetChanged();
        }
    }

    public int getViewType() {
        return currentViewType;
    }

    public void updateStations(@NonNull List<RadioInfo> newStations) {
        this.originalList.clear();
        this.originalList.addAll(newStations);
        this.filteredList.clear();
        this.filteredList.addAll(newStations);
        notifyDataSetChanged();
    }

    public void setCurrentPlayingStreamUrl(@Nullable String url) {
        this.currentPlayingStreamUrl = url;
        notifyDataSetChanged();
    }

    public int filter(@Nullable String query, @Nullable String chipTag) {
        filteredList.clear();
        String cleanQuery = query != null ? query.trim().toLowerCase() : "";
        String cleanTag = chipTag != null ? chipTag.trim().toLowerCase() : "all";

        for (RadioInfo station : originalList) {
            if (station == null) continue;

            // Check chip filter
            boolean matchesChip = true;
            if (!"all".equals(cleanTag) && !cleanTag.isEmpty()) {
                String city = station.getCity() != null ? station.getCity().toLowerCase() : "";
                String desc = station.getDesc() != null ? station.getDesc().toLowerCase() : "";
                String name = station.getName() != null ? station.getName().toLowerCase() : "";

                if ("sanaa".equals(cleanTag)) {
                    matchesChip = city.contains("صنعاء") || city.contains("sana") || name.contains("صنعاء") || desc.contains("صنعاء");
                } else if ("aden".equals(cleanTag)) {
                    matchesChip = city.contains("عدن") || city.contains("aden") || name.contains("عدن") || desc.contains("عدن");
                } else if ("news".equals(cleanTag)) {
                    matchesChip = desc.contains("أخبار") || desc.contains("إخباري") || name.contains("أخبار") || desc.contains("news");
                } else if ("culture".equals(cleanTag)) {
                    matchesChip = desc.contains("ثقاف") || desc.contains("منوع") || name.contains("ثقاف");
                }
            }

            if (!matchesChip) continue;

            // Check text search query
            if (!cleanQuery.isEmpty()) {
                String name = station.getName() != null ? station.getName().toLowerCase() : "";
                String freq = station.getChannelFreq() != null ? station.getChannelFreq().toLowerCase() : "";
                String city = station.getCity() != null ? station.getCity().toLowerCase() : "";
                String tag = station.getTag() != null ? station.getTag().toLowerCase() : "";

                boolean matchesQuery = name.contains(cleanQuery)
                        || freq.contains(cleanQuery)
                        || city.contains(cleanQuery)
                        || tag.contains(cleanQuery);

                if (!matchesQuery) continue;
            }

            filteredList.add(station);
        }

        notifyDataSetChanged();
        return filteredList.size();
    }

    @Override
    public int getItemViewType(int position) {
        return currentViewType;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        if (viewType == VIEW_TYPE_LIST) {
            ItemStationListBinding binding = ItemStationListBinding.inflate(
                    LayoutInflater.from(parent.getContext()), parent, false
            );
            return new StationListViewHolder(binding);
        } else {
            ItemStationGridBinding binding = ItemStationGridBinding.inflate(
                    LayoutInflater.from(parent.getContext()), parent, false
            );
            return new StationGridViewHolder(binding);
        }
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        RadioInfo station = filteredList.get(position);
        if (holder instanceof StationGridViewHolder) {
            ((StationGridViewHolder) holder).bind(context, station, position, currentPlayingStreamUrl, listener);
        } else if (holder instanceof StationListViewHolder) {
            ((StationListViewHolder) holder).bind(context, station, position, currentPlayingStreamUrl, listener);
        }
    }

    @Override
    public int getItemCount() {
        return filteredList.size();
    }

    // Static Grid ViewHolder
    public static class StationGridViewHolder extends RecyclerView.ViewHolder {
        private final ItemStationGridBinding binding;

        public StationGridViewHolder(@NonNull ItemStationGridBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(@NonNull Context context,
                         @NonNull RadioInfo station,
                         int position,
                         @Nullable String currentPlayingStreamUrl,
                         @Nullable OnStationActionListener listener) {
            binding.tvStationName.setText(!TextUtils.isEmpty(station.getName()) ? station.getName() : context.getString(R.string.app_name));
            binding.tvFrequency.setText(!TextUtils.isEmpty(station.getChannelFreq()) ? station.getChannelFreq() : "FM");

            String location = station.getCity();
            if (TextUtils.isEmpty(location) || "null".equalsIgnoreCase(location)) {
                location = context.getString(R.string.label_radio_station);
            }
            binding.tvLocation.setText(location);

            // Logo
            Tools.displayImageOriginal(context, binding.civLogo, station.getLogo());

            // Live status
            boolean isLive = station.isOnline() || !TextUtils.isEmpty(station.getStreamUrl());
            binding.lytLiveBadge.setVisibility(isLive ? View.VISIBLE : View.GONE);

            // Playing state on quick play button
            boolean isThisPlaying = currentPlayingStreamUrl != null
                    && !currentPlayingStreamUrl.isEmpty()
                    && currentPlayingStreamUrl.equals(station.getStreamUrl());

            if (isThisPlaying) {
                binding.btnQuickPlay.setIconResource(R.drawable.ic_media_pause);
            } else {
                binding.btnQuickPlay.setIconResource(R.drawable.ic_media_play);
            }

            // Click on whole card -> Station Details
            binding.cardStation.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onStationClick(station, position);
                }
            });

            // Quick Play Button Click
            binding.btnQuickPlay.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onQuickPlayClick(station, position);
                }
            });
        }
    }

    // Static List ViewHolder
    public static class StationListViewHolder extends RecyclerView.ViewHolder {
        private final ItemStationListBinding binding;

        public StationListViewHolder(@NonNull ItemStationListBinding binding) {
            super(binding.getRoot());
            this.binding = binding;
        }

        public void bind(@NonNull Context context,
                         @NonNull RadioInfo station,
                         int position,
                         @Nullable String currentPlayingStreamUrl,
                         @Nullable OnStationActionListener listener) {
            binding.tvStationName.setText(!TextUtils.isEmpty(station.getName()) ? station.getName() : context.getString(R.string.app_name));
            binding.tvFrequency.setText(!TextUtils.isEmpty(station.getChannelFreq()) ? station.getChannelFreq() : "FM");

            String location = station.getCity();
            if (TextUtils.isEmpty(location) || "null".equalsIgnoreCase(location)) {
                location = context.getString(R.string.label_radio_station);
            }
            binding.tvLocation.setText(location);

            // Logo
            Tools.displayImageOriginal(context, binding.civLogo, station.getLogo());

            // Live status
            boolean isLive = station.isOnline() || !TextUtils.isEmpty(station.getStreamUrl());
            binding.lytLiveBadge.setVisibility(isLive ? View.VISIBLE : View.GONE);

            // Playing state on quick play button
            boolean isThisPlaying = currentPlayingStreamUrl != null
                    && !currentPlayingStreamUrl.isEmpty()
                    && currentPlayingStreamUrl.equals(station.getStreamUrl());

            if (isThisPlaying) {
                binding.btnQuickPlay.setIconResource(R.drawable.ic_media_pause);
            } else {
                binding.btnQuickPlay.setIconResource(R.drawable.ic_media_play);
            }

            // Click on whole card -> Station Details
            binding.cardStation.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onStationClick(station, position);
                }
            });

            // Quick Play Button Click
            binding.btnQuickPlay.setOnClickListener(v -> {
                if (listener != null) {
                    listener.onQuickPlayClick(station, position);
                }
            });
        }
    }
}
