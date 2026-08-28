package com.sana.dev.fm.admin;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;

import androidx.core.content.ContextCompat;

import com.google.firebase.firestore.CollectionReference;
import com.google.firebase.firestore.QuerySnapshot;
import com.sana.dev.fm.R;
import com.sana.dev.fm.admin.episodes.AdminEpisodesActivity;
import com.sana.dev.fm.admin.programs.AdminProgramsActivity;
import com.sana.dev.fm.admin.roles.AdminRolesActivity;
import com.sana.dev.fm.admin.stations.AdminStationsActivity;
import com.sana.dev.fm.admin.users.AdminUsersActivity;
import com.sana.dev.fm.databinding.ActivityAdminDashboardBinding;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.AppConstant;
import com.sana.dev.fm.utils.Tools;
import com.sana.dev.fm.utils.my_firebase.CallBack;
import com.sana.dev.fm.utils.my_firebase.task.FirestoreDbUtility;

import java.util.ArrayList;

/**
 * لوحة التحكم الإدارية الرئيسية — نقطة الدخول للإدارة.
 * يُستدعى فقط من UserProfileActivity بعد التحقق من UserType.
 */
public class AdminDashboardActivity extends BaseActivity {

    private static final String TAG = AdminDashboardActivity.class.getSimpleName();

    private ActivityAdminDashboardBinding binding;
    private FirestoreDbUtility firestoreDbUtility;
    private int pendingCount = 4;

    public static void startActivity(Context context) {
        Intent intent = new Intent(context, AdminDashboardActivity.class);
        context.startActivity(intent);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityAdminDashboardBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        firestoreDbUtility = new FirestoreDbUtility();

        initToolbar();
        initNavigation();
        loadStats();
    }

    private void initToolbar() {
        setSupportActionBar(binding.toolbar);
        binding.toolbar.setNavigationOnClickListener(v -> finish());
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);
    }

    private void initNavigation() {
        binding.cardStations.setOnClickListener(v ->
                AdminStationsActivity.startActivity(this));

        binding.cardPrograms.setOnClickListener(v ->
                AdminProgramsActivity.startActivity(this));

        binding.cardEpisodes.setOnClickListener(v ->
                AdminEpisodesActivity.startActivity(this));

        binding.cardUsers.setOnClickListener(v ->
                AdminUsersActivity.startActivity(this));

        binding.rowManageStations.setOnClickListener(v ->
                AdminStationsActivity.startActivity(this));

        binding.rowManagePrograms.setOnClickListener(v ->
                AdminProgramsActivity.startActivity(this));

        binding.rowManageEpisodes.setOnClickListener(v ->
                AdminEpisodesActivity.startActivity(this));

        binding.rowManageUsers.setOnClickListener(v ->
                AdminUsersActivity.startActivity(this));

        binding.rowManageRoles.setOnClickListener(v ->
                AdminRolesActivity.startActivity(this));
    }

    /**
     * يحمّل إحصائيات لوحة التحكم من Firestore عبر FirestoreDbUtility.
     */
    private void loadStats() {
        binding.progressBar.setVisibility(View.VISIBLE);
        pendingCount = 4;

        loadCount(AppConstant.Firebase.STATIONS_COLLECTION, count ->
                binding.tvStationsCount.setText(String.valueOf(count)));

        loadCount(AppConstant.Firebase.PROGRAMS_COLLECTION, count ->
                binding.tvProgramsCount.setText(String.valueOf(count)));

        loadCount(AppConstant.Firebase.EPISODES_COLLECTION, count ->
                binding.tvEpisodesCount.setText(String.valueOf(count)));

        loadCount(AppConstant.Firebase.USERS_COLLECTION, count -> {
            binding.tvUsersCount.setText(String.valueOf(count));
        });
    }

    private void loadCount(String table, CountCallback cb) {
        CollectionReference ref = firestoreDbUtility.getTopLevelCollection()
                .document(table)
                .collection(table);
        firestoreDbUtility.getMany(ref, new ArrayList<>(), new CallBack() {
            @Override
            public void onSuccess(Object object) {
                int count = 0;
                if (object instanceof QuerySnapshot) {
                    count = ((QuerySnapshot) object).size();
                }
                cb.onCount(count);
                decrementAndHide();
            }

            @Override
            public void onFailure(Object object) {
                cb.onCount(0);
                decrementAndHide();
            }
        });
    }

    private void decrementAndHide() {
        pendingCount--;
        if (pendingCount <= 0) {
            binding.progressBar.setVisibility(View.GONE);
        }
    }

    interface CountCallback {
        void onCount(int count);
    }
}
