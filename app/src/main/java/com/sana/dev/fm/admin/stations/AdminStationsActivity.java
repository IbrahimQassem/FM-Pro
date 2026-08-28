package com.sana.dev.fm.admin.stations;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAdminStationsBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioInfo;
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
 * شاشة قائمة الإذاعات الإدارية — عرض / بحث / تصفية / تفعيل / تعطيل.
 */
public class AdminStationsActivity extends BaseActivity {

    private ActivityAdminStationsBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private KProgressHUDHelper kProgressHUDHelper;
    private AdminStationsAdapter adapter;
    private List<RadioInfo> allItems = new ArrayList<>();
    private int filterMode = 0; // 0=all, 1=active, 2=disabled

    public static void startActivity(Context context) {
        context.startActivity(new Intent(context, AdminStationsActivity.class));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminStationsBinding.inflate(getLayoutInflater());
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
        adapter = new AdminStationsAdapter(this, new ArrayList<>(), this::onItemAction);
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
    }

    private void initFilters() {
        binding.chipGroupFilter.setOnCheckedStateChangeListener((group, checkedIds) -> {
            if (checkedIds.isEmpty()) return;
            int id = checkedIds.get(0);
            if (id == R.id.chip_active) filterMode = 1;
            else if (id == R.id.chip_inactive) filterMode = 2;
            else filterMode = 0;
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
                AdminStationFormActivity.startForCreate(this));
    }

    private void loadData() {
        binding.progressBar.setVisibility(View.VISIBLE);
        binding.lytEmpty.setVisibility(View.GONE);

        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.STATIONS_COLLECTION, AppConstant.Firebase.STATIONS_COLLECTION);

        firestoreDbUtility.getMany(ref, new ArrayList<>(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                allItems = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioInfo.class);
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
        List<RadioInfo> filtered = new ArrayList<>();
        for (RadioInfo item : allItems) {
            if (item == null) continue;
            boolean matchesSearch = query.isEmpty()
                    || (item.getName() != null
                    && item.getName().toLowerCase().contains(query.toLowerCase()));
            boolean matchesFilter = filterMode == 0
                    || (filterMode == 1 && !item.isDisabled())
                    || (filterMode == 2 && item.isDisabled());
            if (matchesSearch && matchesFilter) {
                filtered.add(item);
            }
        }
        adapter.updateData(filtered);
        if (filtered.isEmpty()) showEmptyState();
        else binding.lytEmpty.setVisibility(View.GONE);
    }

    private void showEmptyState() {
        binding.lytEmpty.setVisibility(View.VISIBLE);
    }

    void onItemAction(RadioInfo item, int action) {
        switch (action) {
            case AdminStationsAdapter.ACTION_DETAIL:
                AdminStationDetailActivity.startActivity(this, item.getRadioId());
                break;
            case AdminStationsAdapter.ACTION_EDIT:
                AdminStationFormActivity.startForEdit(this, item.getRadioId());
                break;
            case AdminStationsAdapter.ACTION_DELETE:
                confirmDelete(item);
                break;
            case AdminStationsAdapter.ACTION_TOGGLE:
                toggleActive(item);
                break;
        }
    }

    private void confirmDelete(RadioInfo item) {
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.msg_confirm_delete, item.getName()),
                new ButtonConfig(getString(R.string.label_cancel)),
                new ButtonConfig(getString(R.string.label_delete), v -> deleteItem(item)));
        new FmGeneralDialog(this, config).show();
    }

    private void deleteItem(RadioInfo item) {
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.STATIONS_COLLECTION, AppConstant.Firebase.STATIONS_COLLECTION);
        firestoreDbUtility.deleteDocument(ref, item.getRadioId(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                allItems.remove(item);
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

    private void toggleActive(RadioInfo item) {
        boolean nowDisabled = !item.isDisabled();
        item.setDisabled(nowDisabled);
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.STATIONS_COLLECTION, AppConstant.Firebase.STATIONS_COLLECTION);
        firestoreDbUtility.createOrMerge(ref, item.getRadioId(), item, new CallBack() {
            @Override
            public void onSuccess(Object object) {
                kProgressHUDHelper.dismiss();
                adapter.notifyDataSetChanged();
            }

            @Override
            public void onFailure(Object object) {
                kProgressHUDHelper.dismiss();
                item.setDisabled(!nowDisabled); // revert
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
