package com.sana.dev.fm.admin.episodes;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAdminEpisodesBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.ModelConfig;
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
 * شاشة قائمة الحلقات الإدارية — عرض / بحث / تصفية بالحالة.
 */
public class AdminEpisodesActivity extends BaseActivity {

    private ActivityAdminEpisodesBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private KProgressHUDHelper kProgressHUDHelper;
    private AdminEpisodesAdapter adapter;
    private List<Episode> allItems = new ArrayList<>();
    // 0=all, 1=published(not disabled), 2=draft(disabled), 3=scheduled
    private int filterStatus = 0;

    public static void startActivity(Context context) {
        context.startActivity(new Intent(context, AdminEpisodesActivity.class));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminEpisodesBinding.inflate(getLayoutInflater());
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
        adapter = new AdminEpisodesAdapter(this, new ArrayList<>(), this::onItemAction);
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
    }

    private void initFilters() {
        binding.chipGroupFilter.setOnCheckedStateChangeListener((group, ids) -> {
            if (ids.isEmpty()) return;
            int id = ids.get(0);
            if (id == R.id.chip_published) filterStatus = 1;
            else if (id == R.id.chip_draft) filterStatus = 2;
            else if (id == R.id.chip_scheduled) filterStatus = 3;
            else filterStatus = 0;
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
                AdminEpisodeFormActivity.startForCreate(this));
    }

    private void loadData() {
        binding.progressBar.setVisibility(View.VISIBLE);
        binding.lytEmpty.setVisibility(View.GONE);

        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.EPISODES_COLLECTION, AppConstant.Firebase.EPISODES_COLLECTION);

        firestoreDbUtility.getMany(ref, new ArrayList<>(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                allItems = FirestoreDbUtility.getDataFromQuerySnapshot(object, Episode.class);
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
        List<Episode> filtered = new ArrayList<>();
        for (Episode item : allItems) {
            if (item == null) continue;
            boolean matchesSearch = query.isEmpty()
                    || (item.getEpName() != null
                    && item.getEpName().toLowerCase().contains(query.toLowerCase()));
            boolean matchesStatus = filterStatus == 0
                    || (filterStatus == 1 && !item.isDisabled())
                    || (filterStatus == 2 && item.isDisabled());
            if (matchesSearch && matchesStatus) filtered.add(item);
        }
        adapter.updateData(filtered);
        if (filtered.isEmpty()) showEmptyState();
        else binding.lytEmpty.setVisibility(View.GONE);
    }

    private void showEmptyState() {
        binding.lytEmpty.setVisibility(View.VISIBLE);
    }

    void onItemAction(Episode item, int action) {
        switch (action) {
            case AdminEpisodesAdapter.ACTION_DETAIL:
                AdminEpisodeDetailActivity.startActivity(this, item.getEpId());
                break;
            case AdminEpisodesAdapter.ACTION_EDIT:
                AdminEpisodeFormActivity.startForEdit(this, item.getEpId());
                break;
            case AdminEpisodesAdapter.ACTION_DELETE:
                confirmDelete(item);
                break;
        }
    }

    private void confirmDelete(Episode item) {
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.msg_confirm_delete, item.getEpName()),
                new ButtonConfig(getString(R.string.label_cancel)),
                new ButtonConfig(getString(R.string.label_delete), v -> deleteItem(item)));
        new FmGeneralDialog(this, config).show();
    }

    private void deleteItem(Episode item) {
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.EPISODES_COLLECTION, AppConstant.Firebase.EPISODES_COLLECTION);
        firestoreDbUtility.deleteDocument(ref, item.getEpId(), new CallBack() {
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

    @Override
    protected void onResume() {
        super.onResume();
        loadData();
    }
}
