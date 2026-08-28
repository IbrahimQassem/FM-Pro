package com.sana.dev.fm.admin.users;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;
import android.view.View;

import androidx.core.content.ContextCompat;

import com.bumptech.glide.Glide;
import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAdminUserDetailBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.UserModel;
import com.sana.dev.fm.model.enums.UserType;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.ui.dialog.FmGeneralDialog;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.KProgressHUDHelper;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;

/**
 * تفاصيل المستخدم — تغيير الدور، التفعيل/التعطيل، الحذف.
 */
public class AdminUserDetailActivity extends BaseActivity {

    private static final String EXTRA_USER_ID = "user_id";

    private ActivityAdminUserDetailBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private KProgressHUDHelper kProgressHUDHelper;
    private UserModel currentUser;
    private String userId;

    public static void startActivity(Context context, String userId) {
        Intent i = new Intent(context, AdminUserDetailActivity.class);
        i.putExtra(EXTRA_USER_ID, userId);
        context.startActivity(i);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminUserDetailBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        userId = getIntent().getStringExtra(EXTRA_USER_ID);
        firestoreDbUtility = new FirestoreDbUtility();
        kProgressHUDHelper = new KProgressHUDHelper(this);

        initToolbar();
        loadUser();
    }

    private void initToolbar() {
        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> finish());
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);
        binding.toolbar.setOnMenuItemClickListener(item -> {
            if (item.getItemId() == R.id.action_edit && currentUser != null) {
                AdminUserFormActivity.startForEdit(this, userId);
                return true;
            }
            return false;
        });
    }

    private void loadUser() {
        if (userId == null) { finish(); return; }
        binding.progressBar.setVisibility(View.VISIBLE);

        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);

        firestoreDbUtility.getOne(ref, userId, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                if (object instanceof DocumentSnapshot) {
                    currentUser = ((DocumentSnapshot) object).toObject(UserModel.class);
                    if (currentUser != null) bindUser(currentUser);
                }
            }

            @Override
            public void onFailure(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                showToast(getString(R.string.error_msg));
                finish();
            }
        });
    }

    private void bindUser(UserModel user) {
        // Avatar
        if (user.getPhotoUrl() != null && !user.getPhotoUrl().isEmpty()) {
            Glide.with(this).load(user.getPhotoUrl())
                    .placeholder(R.drawable.ic_person).into(binding.imgAvatar);
        }

        binding.tvName.setText(user.getName());
        binding.tvEmail.setText(user.getEmail());
        binding.tvMobile.setText(user.getMobile() != null ? user.getMobile() : "—");
        binding.tvCreatedAt.setText(user.getCreatedAt() != null ? user.getCreatedAt() : "—");
        binding.tvLastLogin.setText("—"); // not in model directly

        // Role chip
        UserType type = user.getUserType() != null ? user.getUserType() : UserType.USER;
        if (type == UserType.SuperADMIN)
            binding.chipRole.setText(getString(R.string.label_user_role_super_admin));
        else if (type == UserType.ADMIN)
            binding.chipRole.setText(getString(R.string.label_user_role_admin));
        else
            binding.chipRole.setText(getString(R.string.label_user_role_user));

        // Status
        if (user.isDisabled()) {
            binding.tvStatus.setText(getString(R.string.label_inactive));
            binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.md_theme_error));
        } else {
            binding.tvStatus.setText("✓ " + getString(R.string.label_active));
            binding.tvStatus.setTextColor(ContextCompat.getColor(this, R.color.md_theme_primary));
        }

        // Role selector
        if (type == UserType.SuperADMIN) binding.chipRoleSuperAdmin.setChecked(true);
        else if (type == UserType.ADMIN) binding.chipRoleAdmin.setChecked(true);
        else binding.chipRoleUser.setChecked(true);

        binding.btnSaveRole.setOnClickListener(v -> saveRole());

        // Toggle active
        binding.btnToggleActive.setText(user.isDisabled()
                ? getString(R.string.label_activate)
                : getString(R.string.label_deactivate));
        binding.btnToggleActive.setOnClickListener(v -> toggleActive());

        // Delete
        binding.btnDelete.setOnClickListener(v -> confirmDelete());
    }

    private void saveRole() {
        if (currentUser == null) return;
        UserType newType;
        int selectedId = binding.chipGroupRole.getCheckedChipId();
        if (selectedId == R.id.chip_role_super_admin) newType = UserType.SuperADMIN;
        else if (selectedId == R.id.chip_role_admin) newType = UserType.ADMIN;
        else newType = UserType.USER;

        currentUser.setUserType(newType);
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.createOrMerge(ref, userId, currentUser, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                showToast(getString(R.string.msg_saved_successfully));
                bindUser(currentUser);
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                showToast(getString(R.string.error_msg));
            }
        });
    }

    private void toggleActive() {
        if (currentUser == null) return;
        boolean nowDisabled = !currentUser.isDisabled();
        currentUser.setDisabled(nowDisabled);
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.createOrMerge(ref, userId, currentUser, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                bindUser(currentUser);
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                currentUser.setDisabled(!nowDisabled);
            }
        });
    }

    private void confirmDelete() {
        if (currentUser == null) return;
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.msg_confirm_delete, currentUser.getName()),
                new ButtonConfig(getString(R.string.label_cancel)),
                new ButtonConfig(getString(R.string.label_delete), v -> deleteUser()));
        new FmGeneralDialog(this, config).show();
    }

    private void deleteUser() {
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_TABLE, AppConstant.Firebase.USERS_TABLE);
        firestoreDbUtility.deleteDocument(ref, userId, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                showToast(getString(R.string.msg_deleted_successfully));
                finish();
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                showToast(getString(R.string.error_msg));
            }
        });
    }
}
