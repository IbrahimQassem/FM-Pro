package com.sana.dev.fm.admin.users;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.ViewGroup;
import android.widget.PopupMenu;

import androidx.annotation.NonNull;
import androidx.core.content.ContextCompat;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ItemAdminUserBinding;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.enums.UserType;

import java.util.List;

public class AdminUsersAdapter extends RecyclerView.Adapter<AdminUsersAdapter.VH> {

    public static final int ACTION_DETAIL = 0;
    public static final int ACTION_EDIT = 1;
    public static final int ACTION_DELETE = 2;
    public static final int ACTION_TOGGLE = 3;

    interface Listener {
        void onAction(UserModel item, int action);
    }

    private final Context context;
    private List<UserModel> items;
    private final Listener listener;

    public AdminUsersAdapter(Context context, List<UserModel> items, Listener listener) {
        this.context = context;
        this.items = items;
        this.listener = listener;
    }

    public void updateData(List<UserModel> newData) {
        this.items = newData;
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        return new VH(ItemAdminUserBinding.inflate(
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
        final ItemAdminUserBinding b;

        VH(ItemAdminUserBinding b) {
            super(b.getRoot());
            this.b = b;
        }

        void bind(UserModel user) {
            b.tvName.setText(user.getName());
            b.tvEmail.setText(user.getEmail());

            // Role Chip
            UserType type = user.getUserType();
            if (type == UserType.SuperADMIN) {
                b.chipRole.setText(context.getString(R.string.label_user_role_super_admin));
                b.chipRole.setChipBackgroundColorResource(R.color.md_theme_primaryContainer);
            } else if (type == UserType.ADMIN) {
                b.chipRole.setText(context.getString(R.string.label_user_role_admin));
                b.chipRole.setChipBackgroundColorResource(R.color.md_theme_secondaryContainer);
            } else {
                b.chipRole.setText(context.getString(R.string.label_user_role_user));
                b.chipRole.setChipBackgroundColorResource(R.color.md_theme_surfaceVariant);
            }

            // Status badge
            if (user.isDisabled()) {
                b.tvStatus.setText(context.getString(R.string.label_inactive));
                b.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.md_theme_error));
                b.tvStatus.setBackgroundTintList(ContextCompat.getColorStateList(
                        context, R.color.md_theme_errorContainer));
            } else {
                b.tvStatus.setText(context.getString(R.string.label_active));
                b.tvStatus.setTextColor(ContextCompat.getColor(context, R.color.md_theme_primary));
                b.tvStatus.setBackgroundTintList(ContextCompat.getColorStateList(
                        context, R.color.md_theme_primaryContainer));
            }

            if (user.getPhotoUrl() != null && !user.getPhotoUrl().isEmpty()) {
                Glide.with(context).load(user.getPhotoUrl())
                        .placeholder(R.drawable.ic_person)
                        .into(b.imgAvatar);
            }

            b.getRoot().setOnClickListener(v -> listener.onAction(user, ACTION_DETAIL));

            b.btnMore.setOnClickListener(v -> {
                PopupMenu menu = new PopupMenu(context, v);
                menu.inflate(R.menu.menu_admin_item_actions);
                menu.setOnMenuItemClickListener(menuItem -> {
                    int id = menuItem.getItemId();
                    if (id == R.id.action_edit) {
                        listener.onAction(user, ACTION_EDIT);
                        return true;
                    } else if (id == R.id.action_delete) {
                        listener.onAction(user, ACTION_DELETE);
                        return true;
                    }
                    return false;
                });
                menu.show();
            });
        }
    }
}
