package com.sana.dev.fm.ui.activity;

import static com.sana.dev.fm.model.AppConfig.RADIO_NAME;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.sana.dev.fm.R;
import com.sana.dev.fm.utils.Tools;


public class AboutAppActivity extends AppCompatActivity {


    private LinearLayout lyt_parent_email;
    private LinearLayout lyt_parent_deal;
    private TextView txv_email;
    private TextView txv_phone;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_about_app);
        initToolbar();
        initComponent();

//        TooltipCompat.setTooltipText(txv_email, "Tooltip text");

    }


    private void initComponent() {
        lyt_parent_email = findViewById(R.id.lyt_parent_email);
        lyt_parent_deal = findViewById(R.id.lyt_parent_deal);
        txv_email = findViewById(R.id.txv_email);
        txv_phone = findViewById(R.id.txv_phone);
        TextView t_version_no = findViewById(R.id.t_version_no);

        t_version_no.setText(Tools.getVersionCode(this));
//        Tools.displayImageRound(AboutApp.this, findViewById(R.id.iv_logo), _temp.imgProfile);

        lyt_parent_deal.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String phone = txv_phone.getText().toString().trim();
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse("tel:" + phone + ""));
                startActivity(intent);
            }
        });

        lyt_parent_email.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String email = txv_email.getText().toString().trim();
                processNavItemContactUs(email);
            }
        });
    }

    private void initToolbar() {
        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        getSupportActionBar().setTitle(getString(R.string.label_about_us));
        getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        Tools.setSystemBarColor(this, R.color.red_800);
    }


    /**
     * Start an implicit Intent for the user to contact the developer via an email app. The subject
     * is pre-filled with the app's name and the body is pre-filled with the device manufacturer,
     * model, and the Android API level.
     *
     * @return false because we are merely triggering an Intent and not changing the content frame
     * with another Fragment.
     */
    private boolean processNavItemContactUs(String email) {
        final String[] developerEmail = new String[]{email};
        final String deviceInfo = "Device info:";
        final String deviceManufacturer = Build.MANUFACTURER;
        final String deviceModel = Build.MODEL;
        final String androidVersion = "Android version " + Build.VERSION.SDK_INT;
        final String emailTemplate = "\n\n\n" + deviceInfo + "\n  " + deviceManufacturer +
                " " + deviceModel + "\n  " + androidVersion;
        Intent contactUsIntent = new Intent(Intent.ACTION_SENDTO);
        contactUsIntent.setData(Uri.parse("mailto:"));
        contactUsIntent.putExtra(Intent.EXTRA_EMAIL, developerEmail);
        contactUsIntent.putExtra(Intent.EXTRA_SUBJECT, RADIO_NAME);
        contactUsIntent.putExtra(Intent.EXTRA_TEXT, emailTemplate);
        Intent chooser = Intent.createChooser(contactUsIntent, getString(R.string
                .select_email_app));
        startActivity(chooser);
        return false;
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.menu_list_animation, menu);
        return true;
    }


    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
        }
//        else {
//            Toast.makeText(getApplicationContext(), item.getTitle(), Toast.LENGTH_SHORT).show();
//        }
        return super.onOptionsItemSelected(item);
    }
}
