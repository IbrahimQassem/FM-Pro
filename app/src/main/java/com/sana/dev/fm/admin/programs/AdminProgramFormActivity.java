package com.sana.dev.fm.admin.programs;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.widget.Toolbar;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.Tools;

/** نموذج إضافة/تعديل البرنامج */
public class AdminProgramFormActivity extends BaseActivity {
    private static final String EXTRA_ID = "program_id";

    public static void startForCreate(Context ctx) {
        ctx.startActivity(new Intent(ctx, AdminProgramFormActivity.class));
    }

    public static void startForEdit(Context ctx, String id) {
        Intent i = new Intent(ctx, AdminProgramFormActivity.class);
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
        int titleRes = isEdit ? R.string.label_edit_program : R.string.label_add_program;

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
