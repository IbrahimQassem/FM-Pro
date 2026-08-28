package com.sana.dev.fm.ui.dialog;

import static android.view.View.VISIBLE;

import android.app.Activity;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
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
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_add_review);
        dialog.setCancelable(true);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
            lp.copyFrom(window.getAttributes());
            lp.width = WindowManager.LayoutParams.MATCH_PARENT;
            lp.height = WindowManager.LayoutParams.WRAP_CONTENT;
            lp.dimAmount = 0.55f;
            lp.flags |= WindowManager.LayoutParams.FLAG_DIM_BEHIND;
            window.setAttributes(lp);
            window.getAttributes().windowAnimations = R.style.PauseDialogAnimation;
        }

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
                    Toast.makeText(context.getApplicationContext(), context.getString(R.string.msg_please_fill_review_text), Toast.LENGTH_SHORT).show();
                } else {
                    dialog.dismiss();
                    Toast.makeText(context.getApplicationContext(), context.getString(R.string.label_submitted), Toast.LENGTH_SHORT).show();
                }
            }
        });

        dialog.show();
    }

    public void showDialogRateUs() {
        final Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_rate_us);
        dialog.setCancelable(true);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
            lp.copyFrom(window.getAttributes());
            lp.width = WindowManager.LayoutParams.MATCH_PARENT;
            lp.height = WindowManager.LayoutParams.WRAP_CONTENT;
            lp.dimAmount = 0.55f;
            lp.flags |= WindowManager.LayoutParams.FLAG_DIM_BEHIND;
            window.setAttributes(lp);
            window.getAttributes().windowAnimations = R.style.PauseDialogAnimation;
        }

        View btn_cancel = dialog.findViewById(R.id.btn_cancel);
        View btn_confirm = dialog.findViewById(R.id.btn_confirm);

        if (btn_confirm != null) {
            btn_confirm.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    dialog.dismiss();
                    if (context instanceof Activity) {
                        Tools.rateAction((Activity) context);
                    }
                }
            });
        }

        if (btn_cancel != null) {
            btn_cancel.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    dialog.dismiss();
                }
            });
        }

        dialog.show();
    }

    public void aboutUsDialogLight() {
        final Dialog dialog = new Dialog(context);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        dialog.setContentView(R.layout.dialog_contact_light);
        dialog.setCancelable(true);

        Window window = dialog.getWindow();
        if (window != null) {
            window.setBackgroundDrawable(new ColorDrawable(Color.TRANSPARENT));
            WindowManager.LayoutParams lp = new WindowManager.LayoutParams();
            lp.copyFrom(window.getAttributes());
            lp.width = WindowManager.LayoutParams.MATCH_PARENT;
            lp.height = WindowManager.LayoutParams.WRAP_CONTENT;
            lp.dimAmount = 0.55f;
            lp.flags |= WindowManager.LayoutParams.FLAG_DIM_BEHIND;
            window.setAttributes(lp);
            window.getAttributes().windowAnimations = R.style.PauseDialogAnimation;
        }

        View btClose = dialog.findViewById(R.id.bt_close);
        if (btClose != null) {
            btClose.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    dialog.dismiss();
                }
            });
        }

        View ivWhats = dialog.findViewById(R.id.iv_whats);
        if (ivWhats != null) {
            ivWhats.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    String contact = context.getString(R.string.app_mobile);
                    AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
                    if (remoteConfig != null && remoteConfig.getAdminMobile() != null) {
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
                    }
                    dialog.dismiss();
                }
            });
        }

        View ivMobile = dialog.findViewById(R.id.iv_mobile);
        if (ivMobile != null) {
            ivMobile.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    String contact = context.getString(R.string.app_mobile);
                    AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
                    if (remoteConfig != null && remoteConfig.getAdminMobile() != null) {
                        contact = remoteConfig.getAdminMobile();
                    }
                    Intent intent = new Intent(Intent.ACTION_DIAL);
                    intent.setData(Uri.parse("tel:" + contact));
                    context.startActivity(intent);
                    dialog.dismiss();
                }
            });
        }

        View btPortfolio = dialog.findViewById(R.id.bt_portfolio);
        if (btPortfolio != null) {
            btPortfolio.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    FmUtilize.getOpenFacebookIntent(context);
                    String yourPageURL = context.getString(R.string.developer_reference);
                    AppRemoteConfig remoteConfig = Tools.getAppRemoteConfig();
                    if (remoteConfig != null && remoteConfig.getDeveloperReference() != null) {
                        yourPageURL = remoteConfig.getDeveloperReference();
                    }
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(yourPageURL));
                    context.startActivity(browserIntent);
                    dialog.dismiss();
                }
            });
        }

        View ivFacebook = dialog.findViewById(R.id.iv_facebook);
        if (ivFacebook != null) {
            ivFacebook.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    FmUtilize.getOpenFacebookIntent(context);
                    String yourPageURL = context.getString(R.string.app_facebook);
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(yourPageURL));
                    context.startActivity(browserIntent);
                    dialog.dismiss();
                }
            });
        }

        View ivTwitter = dialog.findViewById(R.id.iv_twitter);
        if (ivTwitter != null) {
            ivTwitter.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    String yourPageURL = context.getString(R.string.app_twitter);
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(yourPageURL));
                    context.startActivity(browserIntent);
                    dialog.dismiss();
                }
            });
        }

        View ivInstagram = dialog.findViewById(R.id.iv_instagram);
        if (ivInstagram != null) {
            ivInstagram.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    String yourPageURL = context.getString(R.string.app_instagram);
                    Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(yourPageURL));
                    context.startActivity(browserIntent);
                    dialog.dismiss();
                }
            });
        }

        View ivEmail = dialog.findViewById(R.id.iv_email);
        if (ivEmail != null) {
            ivEmail.setOnClickListener(new View.OnClickListener() {
                public void onClick(View view) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("mailto:" + context.getString(R.string.app_gmail)));
                        intent.putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.app_name));
                        context.startActivity(intent);
                    } catch (ActivityNotFoundException ignored) {
                    }
                    dialog.dismiss();
                }
            });
        }

        dialog.show();
    }

}
