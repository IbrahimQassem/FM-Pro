package com.sana.dev.fm.admin.users;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.widget.Toolbar;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.Tools;

/** نموذج إضافة/تعديل المستخدم */
public class AdminUserFormActivity extends BaseActivity {
    private static final String EXTRA_ID = "user_id";

    public static void startForCreate(Context ctx) {
        ctx.startActivity(new Intent(ctx, AdminUserFormActivity.class));
    }

    public static void startForEdit(Context ctx, String id) {
        Intent i = new Intent(ctx, AdminUserFormActivity.class);
        i.putExtra(EXTRA_ID, id);
        ctx.startActivity(i);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_placeholder);
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);

        boolean isEdit = getIntent().hasExtra(EXTRA_ID);
        int titleRes = isEdit ? R.string.label_edit : R.string.label_add_user;

        Toolbar toolbar = findViewById(R.id.toolbar);
        if (toolbar != null) {
            toolbar.setTitle(titleRes);
            toolbar.setNavigationOnClickListener(v -> finish());
        }

        TextView tvTitle = findViewById(R.id.tv_title);
        if (tvTitle != null) {
            tvTitle.setText(titleRes);
        }
    }
}
