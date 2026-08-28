package com.sana.dev.fm.admin.episodes;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.PopupMenu;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemAdminEpisodeBinding;
import com.sana.dev.fm.model.Episode;

import java.util.List;

public class AdminEpisodesAdapter extends RecyclerView.Adapter<AdminEpisodesAdapter.VH> {

    public static final int ACTION_DETAIL = 0;
    public static final int ACTION_EDIT = 1;
    public static final int ACTION_DELETE = 2;

    interface Listener {
        void onAction(Episode item, int action);
    }

    private final Context context;
    private List<Episode> items;
    private final Listener listener;

    public AdminEpisodesAdapter(Context ctx, List<Episode> items, Listener listener) {
        this.context = ctx;
        this.items = items;
        this.listener = listener;
    }

    public void updateData(List<Episode> newData) {
        this.items = newData;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemAdminEpisodeBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        holder.bind(items.get(position));
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    class VH extends RecyclerView.ViewHolder {
        final ItemAdminEpisodeBinding b;

        VH(ItemAdminEpisodeBinding b) {
            super(b.getRoot());
            this.b = b;
        }

        void bind(Episode item) {
            b.tvTitle.setText(item.getEpName());
            b.tvProgram.setText(item.getProgramName() != null
                    ? item.getProgramName() : item.getProgramId());
            b.tvDate.setText(item.getTimestamp() != null ? item.getTimestamp() : "—");

            // Status badge
            if (item.isDisabled()) {
                b.tvStatus.setText(context.getString(R.string.label_draft));
                b.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.md_theme_onSurfaceVariant));
                b.tvStatus.setBackgroundTintList(ContextCompat.getColorStateList(
                        context, R.color.md_theme_surfaceVariant));
            } else {
                b.tvStatus.setText(context.getString(R.string.label_published));
                b.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.md_theme_primary));
                b.tvStatus.setBackgroundTintList(ContextCompat.getColorStateList(
                        context, R.color.md_theme_primaryContainer));
            }

            b.getRoot().setOnClickListener(v -> listener.onAction(item, ACTION_DETAIL));

            b.btnMore.setOnClickListener(v -> {
                PopupMenu menu = new PopupMenu(context, v);
                menu.inflate(R.menu.menu_admin_item_actions);
                menu.setOnMenuItemClickListener(mi -> {
                    if (mi.getItemId() == R.id.action_edit) {
                        listener.onAction(item, ACTION_EDIT); return true;
                    } else if (mi.getItemId() == R.id.action_delete) {
                        listener.onAction(item, ACTION_DELETE); return true;
                    }
                    return false;
                });
                menu.show();
            });
        }
    }
}
