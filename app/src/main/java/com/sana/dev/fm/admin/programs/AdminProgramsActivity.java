package com.sana.dev.fm.admin.programs;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.View;

import androidx.recyclerview.widget.LinearLayoutManager;

import com.google.firebase.firestore.CollectionReference;
import com.sana.dev.fm.R;
import com.sana.dev.fm.databinding.ActivityAdminProgramsBinding;
import com.sana.dev.fm.model.ButtonConfig;
import com.sana.dev.fm.model.ModelConfig;
import com.sana.dev.fm.model.RadioProgram;
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
 * شاشة قائمة البرامج الإدارية — عرض / بحث / تصفية حسب الإذاعة.
 */
public class AdminProgramsActivity extends BaseActivity {

    private ActivityAdminProgramsBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private KProgressHUDHelper kProgressHUDHelper;
    private AdminProgramsAdapter adapter;
    private List<RadioProgram> allItems = new ArrayList<>();
    private String filterRadioId = null;

    public static void startActivity(Context context) {
        context.startActivity(new Intent(context, AdminProgramsActivity.class));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminProgramsBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        firestoreDbUtility = new FirestoreDbUtility();
        kProgressHUDHelper = new KProgressHUDHelper(this);
        initToolbar();
        initRecyclerView();
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
        adapter = new AdminProgramsAdapter(this, new ArrayList<>(), this::onItemAction);
        binding.recyclerView.setLayoutManager(new LinearLayoutManager(this));
        binding.recyclerView.setAdapter(adapter);
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
                AdminProgramFormActivity.startForCreate(this));
    }

    private void loadData() {
        binding.progressBar.setVisibility(View.VISIBLE);
        binding.lytEmpty.setVisibility(View.GONE);

        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.PROGRAMS_COLLECTION,
                AppConstant.Firebase.PROGRAMS_COLLECTION);

        firestoreDbUtility.getMany(ref, new ArrayList<>(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                binding.progressBar.setVisibility(View.GONE);
                allItems = FirestoreDbUtility.getDataFromQuerySnapshot(object, RadioProgram.class);
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
        List<RadioProgram> filtered = new ArrayList<>();
        for (RadioProgram item : allItems) {
            if (item == null) continue;
            boolean matchesSearch = query.isEmpty()
                    || (item.getPrName() != null
                    && item.getPrName().toLowerCase().contains(query.toLowerCase()));
            boolean matchesRadio = filterRadioId == null
                    || filterRadioId.equals(item.getRadioId());
            if (matchesSearch && matchesRadio) filtered.add(item);
        }
        adapter.updateData(filtered);
        if (filtered.isEmpty()) showEmptyState();
        else binding.lytEmpty.setVisibility(View.GONE);
    }

    private void showEmptyState() {
        binding.lytEmpty.setVisibility(View.VISIBLE);
    }

    void onItemAction(RadioProgram item, int action) {
        switch (action) {
            case AdminProgramsAdapter.ACTION_DETAIL:
                AdminProgramDetailActivity.startActivity(this, item.getProgramId());
                break;
            case AdminProgramsAdapter.ACTION_EDIT:
                AdminProgramFormActivity.startForEdit(this, item.getProgramId());
                break;
            case AdminProgramsAdapter.ACTION_DELETE:
                confirmDelete(item);
                break;
        }
    }

    private void confirmDelete(RadioProgram item) {
        ModelConfig config = new ModelConfig(
                R.drawable.ic_warning,
                getString(R.string.label_warning),
                getString(R.string.msg_confirm_delete, item.getPrName()),
                new ButtonConfig(getString(R.string.label_cancel)),
                new ButtonConfig(getString(R.string.label_delete), v -> deleteItem(item)));
        new FmGeneralDialog(this, config).show();
    }

    private void deleteItem(RadioProgram item) {
        kProgressHUDHelper.showLoading("", false);
        CollectionReference ref = firestoreDbUtility.getCollectionReference(
                AppConstant.Firebase.PROGRAMS_COLLECTION,
                AppConstant.Firebase.PROGRAMS_COLLECTION);
        firestoreDbUtility.deleteDocument(ref, item.getProgramId(), new CallBack() {
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
