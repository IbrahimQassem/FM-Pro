package com.sana.dev.fm.ui.dialog;

import static android.view.View.VISIBLE;

import android.app.Activity;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.widget.AppCompatRatingBar;

import com.google.android.gms.ads.AdRequest;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.AppRemoteConfig;
import com.sana.dev.fm.utils.FmUtilize;
import com.sana.dev.fm.utils.PreferencesManager;
import com.sana.dev.fm.utils.Tools;


public class MainDialog {

    Context context;

    public MainDialog(Context context) {
        this.context = context;
    }

    public void showCustomDialog() {
        final Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE); // before
        dialog.setContentView(R.layout.dialog_add_review);
        dialog.setCancelable(true);

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
        lp.copyFrom(dialog.getWindow().getAttributes());
        lp.width = WindowManager.LayoutParams.WRAP_CONTENT;
        lp.height = WindowManager.LayoutParams.WRAP_CONTENT;

        final EditText et_post = dialog.findViewById(R.id.et_post);
        final AppCompatRatingBar rating_bar = dialog.findViewById(R.id.rating_bar);
        dialog.findViewById(R.id.bt_cancel).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
            }
        });

        dialog.findViewById(R.id.bt_submit).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                String review = et_post.getText().toString().trim();
                if (review.isEmpty()) {
                    Toast.makeText(context.getApplicationContext(), "Please fill review text", Toast.LENGTH_SHORT).show();
                } else {
//                    items.add("(" + rating_bar.getRating() + ") " + review);
//                    adapter.notifyDataSetChanged();
                }
//                if (!adapter.isEmpty()) {
//                    txt_no_item.setVisibility(View.GONE);
//                }
                dialog.dismiss();
                Toast.makeText(context.getApplicationContext(), "Submitted", Toast.LENGTH_SHORT).show();
            }
        });

        dialog.show();
        dialog.getWindow().setAttributes(lp);
    }


    public void showDialogRateUs() {
        final Dialog dialog = new Dialog(context);
        dialog.getWindow().getAttributes().windowAnimations = R.style.PauseDialogAnimation;
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE); // before
        dialog.setContentView(R.layout.dialog_rate_us);
        dialog.getWindow().setBackgroundDrawable(new ColorDrawable(android.graphics.Color.TRANSPARENT));
        dialog.setCancelable(true);

        Button btn_cancel = (Button) dialog.findViewById(R.id.btn_cancel);
        Button btn_confirm = (Button) dialog.findViewById(R.id.btn_confirm);

        btn_confirm.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
                Tools.rateAction((Activity) context);
            }
        });

        btn_cancel.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dialog.dismiss();
            }
        });

        dialog.show();
    }

    public void aboutUsDialogLight() {
        final Dialog dialog = new Dialog(context);
        dialog.getWindow().getAttributes().windowAnimations = R.style.PauseDialogAnimation;
        dialog.requestWindowFeature(1);
        dialog.setContentView(R.layout.dialog_contact_light);
        dialog.getWindow().setBackgroundDrawable(new ColorDrawable(0));
        dialog.setCancelable(true);
        dialog.findViewById(R.id.bt_close).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                dialog.dismiss();
            }
        });

        dialog.findViewById(R.id.iv_whats).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                String contact = context.getString(R.string.app_mobile);
                AppRemoteConfig remoteConfig = PreferencesManager.getInstance().getAppRemoteConfig();
                if (remoteConfig != null) {
                     contact = remoteConfig.getAdminMobile();
                }
                String url = "https://api.whatsapp.com/send?phone=" + contact;
                try {
                    PackageManager pm = context.getPackageManager();
                    pm.getPackageInfo("com.whatsapp", PackageManager.GET_ACTIVITIES);
                    Intent whatsappIntent = new Intent(Intent.ACTION_VIEW);
                    whatsappIntent.setData(Uri.parse(url));
                    context.startActivity(whatsappIntent);
                } catch (PackageManager.NameNotFoundException e) {
                    Toast.makeText(context, context.getString(R.string.whatsapp_not_installed), Toast.LENGTH_SHORT).show();
                    e.printStackTrace();
                }
                dialog.dismiss();
            }
        });

        dialog.findViewById(R.id.iv_mobile).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                String contact = context.getString(R.string.app_mobile);
                AppRemoteConfig remoteConfig = PreferencesManager.getInstance().getAppRemoteConfig();
                if (remoteConfig != null) {
                    contact = remoteConfig.getAdminMobile();
                }
                Intent intent = new Intent(Intent.ACTION_DIAL);
                intent.setData(Uri.parse("tel:" + contact + ""));
                context.startActivity(intent);
                dialog.dismiss();
            }
        });


        dialog.findViewById(R.id.bt_portfolio).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                FmUtilize.getOpenFacebookIntent(context);
                String YourPageURL = context.getString(R.string.developer_reference);
                AppRemoteConfig remoteConfig =  PreferencesManager.getInstance().getAppRemoteConfig();
                if (remoteConfig != null){
                    YourPageURL = remoteConfig.getDeveloperReference();
                }
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(YourPageURL));
                context.startActivity(browserIntent);
                dialog.dismiss();
            }
        });


        dialog.findViewById(R.id.iv_facebook).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                FmUtilize.getOpenFacebookIntent(context);
                String YourPageURL = context.getString(R.string.app_facebook);
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(YourPageURL));
                context.startActivity(browserIntent);
                dialog.dismiss();
            }
        });

        dialog.findViewById(R.id.iv_twitter).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                String YourPageURL = context.getString(R.string.app_twitter);
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(YourPageURL));
                context.startActivity(browserIntent);
                dialog.dismiss();
            }
        });

        dialog.findViewById(R.id.iv_instagram).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                String YourPageURL = context.getString(R.string.app_instagram);
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(YourPageURL));
                context.startActivity(browserIntent);
                dialog.dismiss();
            }
        });


        dialog.findViewById(R.id.iv_email).setOnClickListener(new View.OnClickListener() {
            public void onClick(View view) {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("mailto:" + context.getString(R.string.app_gmail)));
                    intent.putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.app_name));
                    intent.putExtra(Intent.EXTRA_TEXT, "");//your_text
                    context.startActivity(intent);
                } catch (ActivityNotFoundException e) {
                }
                dialog.dismiss();
            }
        });

        dialog.show();
    }

}
