package com.sana.dev.fm.admin.episodes;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.appcompat.widget.Toolbar;

import com.sana.dev.fm.R;
import com.sana.dev.fm.ui.activity.BaseActivity;
import com.sana.dev.fm.utils.Tools;

/** نموذج إضافة/تعديل الحلقة */
public class AdminEpisodeFormActivity extends BaseActivity {
    private static final String EXTRA_ID = "episode_id";

    public static void startForCreate(Context ctx) {
        ctx.startActivity(new Intent(ctx, AdminEpisodeFormActivity.class));
    }

    public static void startForEdit(Context ctx, String id) {
        Intent i = new Intent(ctx, AdminEpisodeFormActivity.class);
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
        int titleRes = isEdit ? R.string.label_edit_episode : R.string.label_add_episode;

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
