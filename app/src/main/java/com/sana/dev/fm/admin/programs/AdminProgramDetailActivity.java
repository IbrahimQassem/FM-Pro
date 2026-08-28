package com.sana.dev.fm.admin.programs;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.widget.Toolbar;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.Tools;

/** تفاصيل البرنامج */
public class AdminProgramDetailActivity extends BaseActivity {
    private static final String EXTRA_ID = "program_id";

    public static void startActivity(Context ctx, String id) {
        Intent i = new Intent(ctx, AdminProgramDetailActivity.class);
        i.putExtra(EXTRA_ID, id);
        ctx.startActivity(i);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_admin_placeholder);
        Tools.setSystemBarColor(this, R.color.md_theme_surface);
        Tools.setSystemBarLight(this);

        Toolbar toolbar = findViewById(R.id.toolbar);
        if (toolbar != null) {
            toolbar.setTitle(R.string.label_program_details);
            toolbar.setNavigationOnClickListener(v -> finish());
        }

        TextView tvTitle = findViewById(R.id.tv_title);
        if (tvTitle != null) {
            tvTitle.setText(R.string.label_program_details);
        }
    }
}
