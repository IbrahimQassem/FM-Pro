package com.sana.dev.fm.utils;


import static com.bumptech.glide.load.resource.drawable.DrawableTransitionOptions.withCrossFade;
import static com.sana.dev.fm.utils.FmUtilize.DATE_TIME_FORMAT;
import static com.sana.dev.fm.utils.FmUtilize._dateFormat;

import android.app.Activity;
import android.app.Dialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.PorterDuff.Mode;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;
import android.util.TypedValue;
import android.view.Menu;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.ColorInt;
import androidx.annotation.ColorRes;
import androidx.annotation.DrawableRes;
import androidx.annotation.Nullable;
import androidx.appcompat.widget.Toolbar;
import androidx.core.content.ContextCompat;
import androidx.core.os.EnvironmentCompat;
import androidx.core.widget.NestedScrollView;
import androidx.vectordrawable.graphics.drawable.VectorDrawableCompat;

import com.bumptech.glide.load.DataSource;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.bumptech.glide.load.engine.GlideException;
import com.bumptech.glide.load.resource.bitmap.CenterCrop;
import com.bumptech.glide.load.resource.bitmap.RoundedCorners;
import com.bumptech.glide.request.RequestListener;
import com.bumptech.glide.request.RequestOptions;
import com.bumptech.glide.request.target.Target;
import com.google.android.material.textfield.TextInputEditText;
import com.google.gson.Gson;
import com.sana.dev.fm.FmApplication;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.AppRemoteConfig;
import com.sana.dev.fm.model.DeviceInfo;
import com.sana.dev.fm.ui.activity.SplashActivity;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Collection;
import java.util.Date;
import java.util.Locale;


public class Tools {
    static final SimpleDateFormat ISO_8601_FORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:sss'Z'");
    private static final String TAG = "Tools";

    public static void setSystemBarColor(Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = act.getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.setStatusBarColor(act.getResources().getColor(R.color.colorPrimaryDark));
        }
    }

    public static void setSystemBarColor(Activity act, @ColorRes int color) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = act.getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.setStatusBarColor(act.getResources().getColor(color));
        }
    }

    public static void setSystemBarColorDialog(Context act, Dialog dialog, @ColorRes int color) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = dialog.getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
            window.setStatusBarColor(act.getResources().getColor(color));
        }
    }

    public static void setSystemBarLight(Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View view = act.findViewById(android.R.id.content);
            int flags = view.getSystemUiVisibility();
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            view.setSystemUiVisibility(flags);
        }
    }

    public static void setSystemBarLightDialog(Dialog dialog) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View view = dialog.findViewById(android.R.id.content);
            int flags = view.getSystemUiVisibility();
            flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
            view.setSystemUiVisibility(flags);
        }
    }

    public static void clearSystemBarLight(Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Window window = act.getWindow();
            window.setStatusBarColor(ContextCompat.getColor(act, R.color.colorPrimaryDark));
        }
    }

    /**
     * Making notification bar transparent
     */
    public static void setSystemBarTransparent(Activity act) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window window = act.getWindow();
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(Color.TRANSPARENT);
        }
    }

    public static void displayImageOriginal(Context ctx, ImageView img, @DrawableRes int resDrawable) {
        try {
            GlideApp.with(ctx)
                    .load(resDrawable)
                    .centerCrop()
                    .transition(withCrossFade())
                    .into(img);
//        GlideApp.with(ctx).load(resDrawable)
//                .into(img);
            //        }
        } catch (
                Exception e) {
            LogUtility.d(TAG + " displayImageOriginal :", e.toString());
        }

    }


    public static void displayImageOriginal(Context ctx, ImageView img, String imgUrl) {
        try {
            if (imgUrl.equals("no_image")) {
                GlideApp.with(ctx).load(ctx.getDrawable(R.drawable.logo_app))
                        .centerCrop()
                        .diskCacheStrategy(DiskCacheStrategy.ALL)
                        .into(img);
            } else {
                GlideApp.with(ctx).load(imgUrl)
                        .fitCenter()
                        .placeholder(ctx.getDrawable(R.drawable.logo_app))
                        .error(ctx.getDrawable(R.drawable.logo_app))
                        .centerCrop()
                        .diskCacheStrategy(DiskCacheStrategy.ALL)
                        .into(img);
            }

//            Glide.with(ctx).load(Uri.parse(imgUrl))
//                    .fitCenter()
//                    .placeholder(AppRemoteConfig.RADIO_IMG)
//                    .error(BaseDrawerActivity.APP_CONFIG.getCount())
//                    .crossFade()
//                    .diskCacheStrategy(DiskCacheStrategy.ALL)
//                    .into(img);

//            LogUtility.d(TAG+" imgUrl :",imgUrl);

//            Picasso.get()
//                    .load(url)
//                    .placeholder(AppRemoteConfig.RADIO_IMG)
//                    .networkPolicy(NetworkPolicy.OFFLINE)
//                    .into(img);
        } catch (Exception e) {
            LogUtility.d(TAG + " displayImageOriginal :", e.toString());
        }
    }

    public static void displayImageRound(final Context ctx, final ImageView img, String imgUrl) {
        try {

            RequestOptions requestOptions = new RequestOptions();
            requestOptions = requestOptions.transforms(new CenterCrop(), new RoundedCorners(100));
            GlideApp.with(ctx)
                    .load(imgUrl)
                    .apply(requestOptions)
                    .placeholder(R.drawable.bg_comment_avatar)
                    .error(ctx.getDrawable(R.drawable.logo_app))
                    .into(img);
//            Glide.with(ctx)
//                    .load(imgUrl)
//                    .apply(RequestOptions.bitmapTransform(new RoundedCorners(50)))
//                    .placeholder(R.drawable.bg_comment_avatar)
//                    .error(AppRemoteConfig.RADIO_LOGO)
//                     .into(img);

//            Glide.with(ctx).load(imgUrl).asBitmap().placeholder(R.drawable.bg_comment_avatar).error(AppRemoteConfig.RADIO_LOGO).centerCrop().into(new BitmapImageViewTarget(img) {
//                @Override
//                protected void setResource(Bitmap resource) {
//                    RoundedBitmapDrawable circularBitmapDrawable = RoundedBitmapDrawableFactory.create(ctx.getResources(), resource);
//                    circularBitmapDrawable.setCircular(true);
//                    img.setImageDrawable(circularBitmapDrawable);
//                }
//            });
        } catch (Exception e) {
            e.printStackTrace();
            LogUtility.d(TAG + " displayImageRound :", e.toString());
        }
    }

    public static void displayUserProfile(final Context ctx, final ImageView img, String imgUrl,@DrawableRes int resId) {
        try {
            VectorDrawableCompat vector = VectorDrawableCompat.create(ctx.getResources(), resId, null);

//            Glide.with(ctx)
//                    .load(imgUrl)
//                    .apply(RequestOptions.bitmapTransform(new RoundedCorners(100)))
//                    .placeholder(R.drawable.bg_comment_avatar)
//                    .error(vector)
//                    .into(img);

            RequestOptions requestOptions = new RequestOptions();
            requestOptions = requestOptions.transforms(new CenterCrop(), new RoundedCorners(100));

            GlideApp.with(ctx).load(imgUrl)
                    .override(Target.SIZE_ORIGINAL, Target.SIZE_ORIGINAL)
                    .placeholder(R.drawable.bg_comment_avatar)
                    .error(vector)
                    .apply(requestOptions)
                    .listener(new RequestListener<Drawable>() {
                        @Override
                        public boolean onLoadFailed(@Nullable GlideException e, Object model, Target<Drawable> target, boolean isFirstResource) {
                            return false;
                        }

                        @Override
                        public boolean onResourceReady(Drawable resource, Object model, Target<Drawable> target, DataSource dataSource, boolean isFirstResource) {
                            return false;
                        }
                    }).into(img);
//            Glide.with(ctx).load(imgUrl).asBitmap().placeholder(R.drawable.bg_comment_avatar).error(vector).centerCrop().into(new BitmapImageViewTarget(img) {
//                @Override
//                protected void setResource(Bitmap resource) {
//                    RoundedBitmapDrawable circularBitmapDrawable = RoundedBitmapDrawableFactory.create(ctx.getResources(), resource);
//                    circularBitmapDrawable.setCircular(true);
//                    img.setImageDrawable(circularBitmapDrawable);
//                }
//            });
        } catch (Exception e) {
            e.printStackTrace();
            LogUtility.d(TAG + " displayUserProfile :", e.toString());
        }
    }

    public static String getFormattedDateSimple(Long dateTime) {
        SimpleDateFormat newFormat = new SimpleDateFormat(_dateFormat);
        return newFormat.format(new Date(dateTime));
    }

    public static String getFormattedDateTimeSimple(Long dateTime, Locale locale) {
        SimpleDateFormat newFormat = new SimpleDateFormat(DATE_TIME_FORMAT, locale);
        return newFormat.format(new Date(dateTime));
    }

    static public Date getDateFormat(long calendar) {
        String strDate = ISO_8601_FORMAT.format(calendar);
        try {
            Date date = ISO_8601_FORMAT.parse(strDate);
            return date;
        } catch (ParseException e) {
            return null;
        }
    }

    public static String getFormattedDateEvent(Long dateTime) {
        SimpleDateFormat newFormat = new SimpleDateFormat("EEE," + _dateFormat);
        return newFormat.format(new Date(dateTime));
    }


    public static String getFormattedTimeEvent(Long time, Locale locale) {
        SimpleDateFormat newFormat = new SimpleDateFormat(FmUtilize._timeFormat, locale);
        return newFormat.format(new Date(time));
    }

    public static String getEmailFromName(String name) {
        if (name != null && !name.equals("")) {
            String email = name.replaceAll(" ", ".").toLowerCase().concat("@mail.com");
            return email;
        }
        return name;
    }

    public static int dpToPx(Context context, float dp) {
        Resources resources = context.getResources();
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, resources.getDisplayMetrics());
    }

    public static int dpToPx(Context c, int dp) {
        Resources r = c.getResources();
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, dp, r.getDisplayMetrics()));
    }

//    public static GoogleMap configActivityMaps(GoogleMap googleMap) {
//        // set map type
//        googleMap.setMapType(GoogleMap.MAP_TYPE_NORMAL);
//        // Enable / Disable zooming controls
//        googleMap.getUiSettings().setZoomControlsEnabled(false);
//
//        // Enable / Disable Compass icon
//        googleMap.getUiSettings().setCompassEnabled(true);
//        // Enable / Disable Rotate gesture
//        googleMap.getUiSettings().setRotateGesturesEnabled(true);
//        // Enable / Disable zooming functionality
//        googleMap.getUiSettings().setZoomGesturesEnabled(true);
//
//        googleMap.getUiSettings().setScrollGesturesEnabled(true);
//        googleMap.getUiSettings().setMapToolbarEnabled(true);
//
//        return googleMap;
//    }

    public static void copyToClipboard(Context context, String data) {
        ClipboardManager clipboard = (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
        ClipData clip = ClipData.newPlainText("clipboard", data);
        clipboard.setPrimaryClip(clip);
        Toast.makeText(context, "Text copied to clipboard", Toast.LENGTH_SHORT).show();
    }

    public static void nestedScrollTo(final NestedScrollView nested, final View targetView) {
        nested.post(new Runnable() {
            @Override
            public void run() {
                nested.scrollTo(500, targetView.getBottom());
            }
        });
    }

    public static int dip2px(Context context, float dpValue) {
        final float scale = context.getResources().getDisplayMetrics().density;
        return (int) (dpValue * scale + 0.5f);
    }

    public static int px2dip(Context context, float pxValue) {
        final float scale = context.getResources().getDisplayMetrics().density;
        return (int) (pxValue / scale + 0.5f);
    }

    public static boolean toggleArrow(View view) {
        if (view.getRotation() == 0) {
            view.animate().setDuration(200).rotation(180);
            return true;
        } else {
            view.animate().setDuration(200).rotation(0);
            return false;
        }
    }

    public static boolean toggleArrow(boolean show, View view) {
        return toggleArrow(show, view, true);
    }

    public static boolean toggleArrow(boolean show, View view, boolean delay) {
        if (show) {
            view.animate().setDuration(delay ? 200 : 0).rotation(180);
            return true;
        } else {
            view.animate().setDuration(delay ? 200 : 0).rotation(0);
            return false;
        }
    }

    public static void changeNavigateionIconColor(Toolbar toolbar, @ColorInt int color) {
        Drawable drawable = toolbar.getNavigationIcon();
        drawable.mutate();
        drawable.setColorFilter(color, Mode.SRC_ATOP);
    }

    public static void changeMenuIconColor(Menu menu, @ColorInt int color) {
        for (int i = 0; i < menu.size(); i++) {
            Drawable drawable = menu.getItem(i).getIcon();
            if (drawable == null) continue;
            drawable.mutate();
            drawable.setColorFilter(color, Mode.SRC_ATOP);
        }
    }

    public static void changeOverflowMenuIconColor(Toolbar toolbar, @ColorInt int color) {
        try {
            Drawable drawable = toolbar.getOverflowIcon();
            drawable.mutate();
            drawable.setColorFilter(color, Mode.SRC_ATOP);
        } catch (Exception e) {
        }
    }

    public static int getScreenWidth() {
        return Resources.getSystem().getDisplayMetrics().widthPixels;
    }

    public static int getScreenHeight() {
        return Resources.getSystem().getDisplayMetrics().heightPixels;
    }

    public static String toCamelCase(String input) {
        input = input.toLowerCase();
        StringBuilder titleCase = new StringBuilder();
        boolean nextTitleCase = true;

        for (char c : input.toCharArray()) {
            if (Character.isSpaceChar(c)) {
                nextTitleCase = true;
            } else if (nextTitleCase) {
                c = Character.toTitleCase(c);
                nextTitleCase = false;
            }

            titleCase.append(c);
        }

        return titleCase.toString();
    }

    public static String insertPeriodically(String text, String insert, int period) {
        StringBuilder builder = new StringBuilder(text.length() + insert.length() * (text.length() / period) + 1);
        int index = 0;
        String prefix = "";
        while (index < text.length()) {
            builder.append(prefix);
            prefix = insert;
            builder.append(text.substring(index, Math.min(index + period, text.length())));
            index += period;
        }
        return builder.toString();
    }


    public static void rateAction(Activity activity) {
        Uri uri = Uri.parse("market://details?id=" + activity.getPackageName());
        Intent goToMarket = new Intent(Intent.ACTION_VIEW, uri);
        try {
            activity.startActivity(goToMarket);
        } catch (ActivityNotFoundException e) {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("http://play.google.com/store/apps/details?id=" + activity.getPackageName())));
        }
    }

    public static URL getFacebookProfilePicture(String userID) {
        URL imageURL = null;
//        Bitmap bitmap = null;

        try {
            imageURL = new URL("https://graph.facebook.com/" + userID + "/picture?type=large");
//            bitmap = BitmapFactory.decodeStream(imageURL.openConnection().getInputStream());

        } catch (MalformedURLException e) {
            e.printStackTrace();
        }

        return imageURL;
    }


//    public static void rateAction(Activity activity) {
//        StringBuilder stringBuilder = new StringBuilder();
//        stringBuilder.append("market://details?id=");
//        stringBuilder.append(activity.getPackageName());
//        String str = "android.intent.action.VIEW";
//        try {
//            activity.startActivity(new Intent(str, Uri.parse(stringBuilder.toString())));
//        } catch (ActivityNotFoundException unused) {
//            StringBuilder stringBuilder2 = new StringBuilder();
//            stringBuilder2.append("http://play.google.com/store/apps/details?id=");
//            stringBuilder2.append(activity.getPackageName());
//            activity.startActivity(new Intent(str, Uri.parse(stringBuilder2.toString())));
//        }
//    }

    public static String getDeviceName() {
        String str = Build.MANUFACTURER;
        String str2 = Build.MODEL;
        if (str2.startsWith(str)) {
            return str2;
        }
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(str);
        stringBuilder.append(" ");
        stringBuilder.append(str2);
        return stringBuilder.toString();
    }

    public static String getAndroidVersion() {
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(Build.VERSION.RELEASE);
        stringBuilder.append("");
        return stringBuilder.toString();
    }

    public static int getVersionCode(Context context) {
        try {
            return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode;
        } catch (PackageManager.NameNotFoundException unused) {
            return -1;
        }
    }

    public static String getVersionName(Context context) {
        try {
            PackageInfo packageInfo = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            StringBuilder stringBuilder = new StringBuilder();
            stringBuilder.append(context.getString(R.string.app_version));
            stringBuilder.append(" ");
            stringBuilder.append(packageInfo.versionName);
            return stringBuilder.toString();
        } catch (PackageManager.NameNotFoundException unused) {
            return context.getString(R.string.version_unknown);
        }
    }

    public static String getVersionNamePlain(Context context) {
        try {
            return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName;
        } catch (PackageManager.NameNotFoundException unused) {
            return context.getString(R.string.version_unknown);
        }
    }

    public static DeviceInfo getDeviceInfo(Context context) {
        DeviceInfo deviceInfo = new DeviceInfo();
        deviceInfo.device = getDeviceName();
        deviceInfo.os_version = getAndroidVersion();
        StringBuilder stringBuilder = new StringBuilder();
        stringBuilder.append(getVersionCode(context));
        stringBuilder.append(" (");
        stringBuilder.append(getVersionNamePlain(context));
        stringBuilder.append(")");
        deviceInfo.app_version = stringBuilder.toString();
        deviceInfo.serial = getDeviceID(context);
        return deviceInfo;
    }

    public static String getDeviceID(Context context) {
        String str = Build.SERIAL;
        if (str != null && !str.trim().isEmpty() && !str.equals(EnvironmentCompat.MEDIA_UNKNOWN)) {
            return str;
        }
        try {
            str = Settings.Secure.getString(context.getContentResolver(), "android_id");
            return str;
        } catch (Exception unused) {
            return str;
        }
    }

    public static String getFormattedDateOnly(Long l, Locale locale) {
//        return new SimpleDateFormat("dd MMM yy", FmUtilize._arabicFormat).format(new Date(l.longValue()));
//        return new SimpleDateFormat("d MMM yyyy", locale).format(new Date(l.longValue()));
        return new SimpleDateFormat("dd MMM yy", locale).format(new Date(l.longValue()));
    }

    public static String getFormattedDateOnly(String format,Long l, Locale locale) {
//        return new SimpleDateFormat("dd MMM yy", FmUtilize._arabicFormat).format(new Date(l.longValue()));
        return new SimpleDateFormat(format, locale).format(new Date(l.longValue()));
    }

    public static void directLinkToBrowser(Activity activity, String str) {
        try {
            activity.startActivity(new Intent("android.intent.action.VIEW", Uri.parse(str)));
        } catch (Exception unused) {
            Toast.makeText(activity, "Ops, Cannot open url", Toast.LENGTH_LONG).show();
        }
    }


//    public static void openInAppBrowser(Activity activity, String str, boolean z) {
//        StringBuilder stringBuilder = new StringBuilder();
//        stringBuilder.append("t=");
//        stringBuilder.append(System.currentTimeMillis());
//        str = appendQuery(str, stringBuilder.toString());
//        if (URLUtil.isValidUrl(str)) {
//            ActivityWebView.navigate(activity, str, z);
//        } else {
//            Toast.makeText(activity, "Ops, Cannot open url", 1).show();
//        }
//    }

    public static String getHostName(String str) {
        String str2 = "www.";
        try {
            String host = new URI(str).getHost();
            if (!host.startsWith(str2)) {
                StringBuilder stringBuilder = new StringBuilder();
                stringBuilder.append(str2);
                stringBuilder.append(host);
                host = stringBuilder.toString();
            }
            return host;
        } catch (URISyntaxException e) {
            if (e.getMessage() != null) {
                Log.e("ERROR", e.getMessage());
            }
            return str;
        }
    }

    public static Bitmap getRoundedCornerBitmap(Bitmap bitmap, int pixels) {
        Bitmap output = Bitmap.createBitmap(bitmap.getWidth(), bitmap
                .getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(output);

        final int color = 0xff424242;
        final Paint paint = new Paint();
        final Rect rect = new Rect(0, 0, bitmap.getWidth(), bitmap.getHeight());
        final RectF rectF = new RectF(rect);
        final float roundPx = pixels;

        paint.setAntiAlias(true);
        canvas.drawARGB(0, 0, 0, 0);
        paint.setColor(color);
        canvas.drawRoundRect(rectF, roundPx, roundPx, paint);

        paint.setXfermode(new PorterDuffXfermode(Mode.SRC_IN));
        canvas.drawBitmap(bitmap, rect, rect, paint);

        return output;
    }

    public static String toTimeFormat(long millSecond) {
        long duration = millSecond / 1000;
        int hours = (int) duration / 3600;
        int remainder = (int) duration - hours * 3600;
        int minute = remainder / 60;
        remainder = remainder - minute * 60;
        int second = remainder;
        String strMinute = Integer.toString(minute);
        String strSecond = Integer.toString(second);
        String strHour;
        if (strMinute.length() < 2) {
            strMinute = "0" + minute;
        }
        if (strSecond.length() < 2) {
            strSecond = "0" + second;
        }
        if (hours == 0) {
            return strMinute + ":" + strSecond;
        } else {
            return hours + ":" + strMinute + ":" + strSecond;
        }
    }

    public static void setLocale(Activity activity, String languageCode) {
        Locale locale = new Locale(languageCode);
        Locale.setDefault(locale);
        Resources resources = activity.getResources();
        Configuration config = resources.getConfiguration();
        config.setLocale(locale);
        resources.updateConfiguration(config, resources.getDisplayMetrics());
    }

    public static boolean isEmpty(EditText editText) {
        if (editText.getText().toString().trim().length() > 0)
            return false;
        return true;
    }

    public static String toString(View view) {
        if (view instanceof EditText) {
            EditText editText = (EditText) view;
            if (editText.getText().toString().trim().length() > 0)
                return editText.getText().toString().trim();
        } else if (view instanceof TextView) {
            TextView textView = (TextView) view;
            if (textView.getText().toString().trim().length() > 0)
                return textView.getText().toString().trim();
        } else if (view instanceof TextInputEditText) {
            TextInputEditText textView = (TextInputEditText) view;
            if (textView.getText().toString().trim().length() > 0)
                return textView.getText().toString().trim();
        }

        return "";
    }

    public static void setTextOrHideIfEmpty(View view, String val) {
        if (Tools.isEmpty(val)) {
            view.setVisibility(View.GONE);
        } else {
            view.setVisibility(View.VISIBLE);
            if (view instanceof EditText) {
                EditText editText = (EditText) view;
                editText.setText(val);
            } else if (view instanceof TextView) {
                TextView textView = (TextView) view;
                textView.setText(val);
            } else if (view instanceof TextInputEditText) {
                TextInputEditText textView = (TextInputEditText) view;
                textView.setText(val);
            }
        }
    }

    public static void disableEditText(EditText editText) {
        editText.setFocusable(false);
        editText.setEnabled(false);
        editText.setCursorVisible(false);
        editText.setKeyListener(null);
        editText.setBackgroundColor(Color.TRANSPARENT);
    }

    public static boolean isEmpty(Collection coll) {
        return (coll == null || coll.isEmpty());
    }

    public static boolean isEmpty(@androidx.annotation.Nullable CharSequence str) {
        return str == null || str.length() == 0;
    }

    public static void emptyEditText(EditText editText, String hint) {
        editText.setError(hint);
        editText.requestFocus();
        editText.setFocusable(true);
    }

    public static AppRemoteConfig getAppRemoteConfig() {
        AppRemoteConfig model = new AppRemoteConfig();
        PreferencesManager preferences = PreferencesManager.getInstance();
        String json = preferences.read(AppConstant.General.APP_REMOTE_CONFIG, getDefAppRemoteConfig(FmApplication.getInstance()).toString());
        if (!isEmpty(json)) {
            Gson gson = new Gson();
            model = gson.fromJson(json, AppRemoteConfig.class);
        }
//        Log.d(TAG, " getAppRemoteConfig : " + new Gson().toJson(model));
        return model;
    }


    public static AppRemoteConfig getDefAppRemoteConfig(Context ctx) {
        Gson gson = new Gson();
        PreferencesManager preferences = PreferencesManager.getInstance();
        AppRemoteConfig appRemoteConfig = new AppRemoteConfig(ctx.getString(R.string.app_mobile), ctx.getString(R.string.developer_reference), true, true, true, true, false);
        String json = preferences.read(AppConstant.General.APP_REMOTE_CONFIG, appRemoteConfig.toString());
        return gson.fromJson(json, AppRemoteConfig.class);
    }
}
