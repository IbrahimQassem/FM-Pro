package com.sana.dev.fm.admin.programs;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.PopupMenu;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemAdminProgramBinding;
import com.sana.dev.fm.model.RadioProgram;

import java.util.List;

public class AdminProgramsAdapter extends RecyclerView.Adapter<AdminProgramsAdapter.VH> {

    public static final int ACTION_DETAIL = 0;
    public static final int ACTION_EDIT = 1;
    public static final int ACTION_DELETE = 2;

    interface Listener {
        void onAction(RadioProgram item, int action);
    }

    private final Context context;
    private List<RadioProgram> items;
    private final Listener listener;

    public AdminProgramsAdapter(Context ctx, List<RadioProgram> items, Listener listener) {
        this.context = ctx;
        this.items = items;
        this.listener = listener;
    }

    public void updateData(List<RadioProgram> newData) {
        this.items = newData;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemAdminProgramBinding.inflate(
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
        final ItemAdminProgramBinding b;

        VH(ItemAdminProgramBinding b) {
            super(b.getRoot());
            this.b = b;
        }

        void bind(RadioProgram item) {
            b.tvName.setText(item.getPrName());
            b.tvStation.setText(item.getRadioId());
            b.tvCategory.setText(context.getString(
                    R.string.label_episodes_count_fmt, item.getEpisodeCount()));

            if (item.getPrProfile() != null && !item.getPrProfile().isEmpty()) {
                Glide.with(context).load(item.getPrProfile())
                        .placeholder(R.drawable.ic_nav_programs)
                        .into(b.imgLogo);
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
