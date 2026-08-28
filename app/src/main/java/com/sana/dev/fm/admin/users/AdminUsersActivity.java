package com.sana.dev.fm.admin.users;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAdminUsersBinding;
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
import java.util.List;

/**
 * شاشة قائمة المستخدمين الإدارية — عرض / بحث / تصفية حسب الدور والحالة.
 */
public class AdminUsersActivity extends BaseActivity {

    private ActivityAdminUsersBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private KProgressHUDHelper kProgressHUDHelper;
    private AdminUsersAdapter adapter;
    private List<UserModel> allItems = new ArrayList<>();
    private UserType filterRole = null;
    private int filterStatus = 0; // 0=all, 1=active, 2=disabled

    public static void startActivity(Context context) {
        context.startActivity(new Intent(context, AdminUsersActivity.class));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminUsersBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        firestoreDbUtility = new FirestoreDbUtility();
        kProgressHUDHelper = new KProgressHUDHelper(this);

        initToolbar();
        initRecyclerView();
        initFilters();
        initSearch();
        initFab();
        loadData();
    }

    private void initToolbar() {
        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> finish());
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);
    }

    private void initRecyclerView() {
        adapter = new AdminUsersAdapter(this, new ArrayList<>(), this::onItemAction);
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
    }

    private void initFilters() {
        binding.chipGroupFilter.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.isEmpty()) return;
            int id = checkedIds.get(0);
            if (id == R.id.chip_user) { filterRole = UserType.USER; filterStatus = 0; }
            else if (id == R.id.chip_admin) { filterRole = UserType.ADMIN; filterStatus = 0; }
            else if (id == R.id.chip_super_admin) { filterRole = UserType.SuperADMIN; filterStatus = 0; }
            else if (id == R.id.chip_active) { filterRole = null; filterStatus = 1; }
            else if (id == R.id.chip_disabled) { filterRole = null; filterStatus = 2; }
            else { filterRole = null; filterStatus = 0; }
            applyFilter(binding.searchBar.getText() != null
                    ? binding.searchBar.getText().toString() : "");
        });
    }

    private void initSearch() {
        binding.searchBar.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                applyFilter(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private void initFab() {
        binding.fabAdd.setOnClickListener(v ->
                AdminUserFormActivity.startForCreate(this));
    }

    private void loadData() {
        binding.progressBar.setVisibility(View.VISIBLE);
        binding.lytEmpty.setVisibility(View.GONE);

        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_COLLECTION, AppConstant.Firebase.USERS_COLLECTION);

        firestoreDbUtility.getMany(ref, new ArrayList<>(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                allItems = FirestoreDbUtility.getDataFromQuerySnapshot(object, UserModel.class);
                applyFilter("");
            }

            @Override
            public void onFailure(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                showEmptyState();
            }
        });
    }

    private void applyFilter(String query) {
        List<UserModel> filtered = new ArrayList<>();
        for (UserModel user : allItems) {
            if (user == null) continue;
            boolean matchesSearch = query.isEmpty()
                    || (user.getName() != null
                    && user.getName().toLowerCase().contains(query.toLowerCase()))
                    || (user.getEmail() != null
                    && user.getEmail().toLowerCase().contains(query.toLowerCase()));
            boolean matchesRole = filterRole == null || filterRole == user.getUserType();
            boolean matchesStatus = filterStatus == 0
                    || (filterStatus == 1 && !user.isDisabled())
                    || (filterStatus == 2 && user.isDisabled());
            if (matchesSearch && matchesRole && matchesStatus) {
                filtered.add(user);
            }
        }
        adapter.updateData(filtered);
        if (filtered.isEmpty()) showEmptyState();
        else binding.lytEmpty.setVisibility(View.GONE);
    }

    private void showEmptyState() {
        binding.lytEmpty.setVisibility(View.VISIBLE);
    }

    void onItemAction(UserModel user, int action) {
        switch (action) {
            case AdminUsersAdapter.ACTION_DETAIL:
                AdminUserDetailActivity.startActivity(this, user.getUserId());
                break;
            case AdminUsersAdapter.ACTION_EDIT:
                AdminUserFormActivity.startForEdit(this, user.getUserId());
                break;
            case AdminUsersAdapter.ACTION_DELETE:
                confirmDelete(user);
                break;
            case AdminUsersAdapter.ACTION_TOGGLE:
                toggleActive(user);
                break;
        }
    }

    private void confirmDelete(UserModel user) {
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.msg_confirm_delete, user.getName()),
                new ButtonConfig(getString(R.string.label_cancel)),
                new ButtonConfig(getString(R.string.label_delete), v -> deleteUser(user)));
        new FmGeneralDialog(this, config).show();
    }

    private void deleteUser(UserModel user) {
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_COLLECTION, AppConstant.Firebase.USERS_COLLECTION);
        firestoreDbUtility.deleteDocument(ref, user.getUserId(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                allItems.remove(user);
                applyFilter("");
                showToast(getString(R.string.msg_deleted_successfully));
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                showToast(getString(R.string.error_msg));
            }
        });
    }

    private void toggleActive(UserModel user) {
        boolean nowDisabled = !user.isDisabled();
        user.setDisabled(nowDisabled);
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.USERS_COLLECTION, AppConstant.Firebase.USERS_COLLECTION);
        firestoreDbUtility.createOrMerge(ref, user.getUserId(), user, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                adapter.notifyDataSetChanged();
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                user.setDisabled(!nowDisabled);
                adapter.notifyDataSetChanged();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadData();
    }
}
