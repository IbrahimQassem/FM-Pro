package com.sana.dev.fm.admin.stations;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.PopupMenu;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemAdminStationBinding;
import com.sana.dev.fm.model.RadioInfo;

import java.util.List;

public class AdminStationsAdapter extends RecyclerView.Adapter<AdminStationsAdapter.VH> {

    public static final int ACTION_DETAIL = 0;
    public static final int ACTION_EDIT = 1;
    public static final int ACTION_DELETE = 2;
    public static final int ACTION_TOGGLE = 3;

    interface Listener {
        void onAction(RadioInfo item, int action);
    }

    private final Context context;
    private List<RadioInfo> items;
    private final Listener listener;

    public AdminStationsAdapter(Context context, List<RadioInfo> items, Listener listener) {
        this.context = context;
        this.items = items;
        this.listener = listener;
    }

    public void updateData(List<RadioInfo> newData) {
        this.items = newData;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemAdminStationBinding.inflate(
                LayoutInflater.from(parent.getContext()), parent, false));
    }

    @Override
    public void onBindViewHolder(@NonNull VH holder, int position) {
        RadioInfo item = items.get(position);
        holder.bind(item);
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    class VH extends RecyclerView.ViewHolder {
        final ItemAdminStationBinding b;

        VH(ItemAdminStationBinding b) {
            super(b.getRoot());
            this.b = b;
        }

        void bind(RadioInfo item) {
            b.tvName.setText(item.getName());
            b.tvDescription.setText(item.getDesc());
            b.tvPriority.setText(context.getString(R.string.label_priority_fmt, item.getPriority()));

            if (item.getLogo() != null && !item.getLogo().isEmpty()) {
                Glide.with(context).load(item.getLogo())
                        .placeholder(R.drawable.ic_radio)
                        .into(b.imgLogo);
            }

            b.switchActive.setOnCheckedChangeListener(null);
            b.switchActive.setChecked(!item.isDisabled());
            b.switchActive.setOnCheckedChangeListener((btn, isChecked) ->
                    listener.onAction(item, ACTION_TOGGLE));

            b.getRoot().setOnClickListener(v -> listener.onAction(item, ACTION_DETAIL));

            b.btnMore.setOnClickListener(v -> {
                PopupMenu menu = new PopupMenu(context, v);
                menu.inflate(R.menu.menu_admin_item_actions);
                menu.setOnMenuItemClickListener(menuItem -> {
                    int id = menuItem.getItemId();
                    if (id == R.id.action_edit) {
                        listener.onAction(item, ACTION_EDIT);
                        return true;
                    } else if (id == R.id.action_delete) {
                        listener.onAction(item, ACTION_DELETE);
                        return true;
                    }
                    return false;
                });
                menu.show();
            });
        }
    }
}
