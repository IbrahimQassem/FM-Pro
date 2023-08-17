package com.sana.dev.fm.utils;

import static android.content.Context.MODE_PRIVATE;
import static com.sana.dev.fm.FmApplication.TAG;
import static com.sana.dev.fm.model.AppConfig.RADIO_NAME;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.res.Resources;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Point;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.telephony.TelephonyManager;
import android.text.TextUtils;
import android.util.Log;
import android.view.Display;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.DatePicker;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;

import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.sana.dev.fm.BuildConfig;
import com.sana.dev.fm.R;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.utils.my_firebase.FirebaseConstants;

import java.io.FileNotFoundException;
import java.security.SecureRandom;
import java.text.DateFormatSymbols;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collection;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NavigableMap;
import java.util.Properties;
import java.util.Random;
import java.util.TreeMap;
import java.util.UUID;

/**
 * Created by  on 05.11.14.
 */
public class FmUtilize {

    public static final Locale _arabicFormat = new Locale("ar", "SA");  // Arabic language. Saudi Arabia cultural norms.
    public static final SimpleDateFormat month_date = new SimpleDateFormat("MMMM", _arabicFormat);
    public static final String DATE_TIME_FORMAT = "MM/dd/yyyy HH:mm:ss a";

//    public static final Locale _arabicFormat = new Locale("en", "US");  // Arabic language. Saudi Arabia cultural norms.

    public static final String _dateFormat = "MM/dd/yyyy";
    public static final String _timeFormat = "hh:mm a";//"HH:mm:ss";

    public static final Comparator<Episode> sortByDate = new Comparator<Episode>() {

        final SimpleDateFormat sdf = new SimpleDateFormat(_timeFormat);

        // Todo fixme
        public int compare(Episode ord1, Episode ord2) {
//            Date d1 = new Date(ord1.getDateTimeModelList().getTimeStart());
//            Date d2 = new Date(ord1.getDateTimeModelList().getTimeEnd());
//            try {
////                d1 = sdf.format(ord1.getDateTimeModel().getTimeStart());
////                d2 = sdf.parse(ord2.getEpStartAt());
//            } catch (ParseException e) {
//                e.printStackTrace();
//            }
//            return (d1.getTime() > d2.getTime() ? -1 : 1);     //descending
//            return (d1.getTime() > d2.getTime() ? 1 : -1);     //ascending
            return 1;
        }
    };

    private static final NavigableMap<Long, String> suffixes = new TreeMap<>();
    private static final String PREF_UNIQUE_ID = "PREF_UNIQUE_ID";
    private static final int SECOND_MILLIS = 1000;
    private static final int MINUTE_MILLIS = 60 * SECOND_MILLIS;
    private static final int HOUR_MILLIS = 60 * MINUTE_MILLIS;
    private static final int DAY_MILLIS = 24 * HOUR_MILLIS;
    private static final Random rand = new Random();
    private static int screenWidth = 0;
    private static int screenHeight = 0;
    private static String uniqueID = null;

    static {
        suffixes.put(1_000L, "k");
        suffixes.put(1_000_000L, "M");
        suffixes.put(1_000_000_000L, "G");
        suffixes.put(1_000_000_000_000L, "T");
        suffixes.put(1_000_000_000_000_000L, "P");
        suffixes.put(1_000_000_000_000_000_000L, "E");
    }

    public static int dpToPx(int dp) {
        return (int) (dp * Resources.getSystem().getDisplayMetrics().density);
    }

    public static int getScreenHeight(Context c) {
        if (screenHeight == 0) {
            WindowManager wm = (WindowManager) c.getSystemService(Context.WINDOW_SERVICE);
            Display display = wm.getDefaultDisplay();
            Point size = new Point();
            display.getSize(size);
            screenHeight = size.y;
        }

        return screenHeight;
    }

    public static int getScreenWidth(Context c) {
        if (screenWidth == 0) {
            WindowManager wm = (WindowManager) c.getSystemService(Context.WINDOW_SERVICE);
            Display display = wm.getDefaultDisplay();
            Point size = new Point();
            display.getSize(size);
            screenWidth = size.x;
        }

        return screenWidth;
    }

    public static boolean isAndroid5() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP;
    }

    /**
     * @param datePicker
     * @return a java.util.Date
     */
    public static Date getDateFromDatePicket(DatePicker datePicker) {
        int day = datePicker.getDayOfMonth();
        int month = datePicker.getMonth();
        int year = datePicker.getYear();

        Calendar calendar = Calendar.getInstance();
        calendar.set(year, month, day);

        return calendar.getTime();
    }

    public static String setTimeFormat(int hour, int minutes, int sec) {
//        return hour +":"+min +":" +sec;
//        return String.format("%02d:%02d %s", (hour == 12 || hour == 0) ? 12 : hour % 12, min, isPM ? "PM" : "AM");

        String timeSet = "";
        if (hour > 12) {
            hour -= 12;
            timeSet = "PM";
        } else if (hour == 0) {
            hour += 12;
            timeSet = "AM";
        } else if (hour == 12) {
            timeSet = "PM";
        } else {
            timeSet = "AM";
        }

        String min = "";
        if (minutes < 10)
            min = "0" + minutes;
        else
            min = String.valueOf(minutes);

        // Append in a StringBuilder
        String aTime = new StringBuilder().append(hour).append(':')
                .append(min).append(" ").append(timeSet).toString();
        return aTime;
    }

    public static long stringTimeToMillis(String _time) {
        SimpleDateFormat sdf = new SimpleDateFormat(_timeFormat, Locale.ENGLISH);
        long millis = 0;
        try {
            Date parsedDate = sdf.parse(_time);
            millis = parsedDate.getTime();
//             millis = milliseconds - (new Date()).getTime();
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return millis;
    }

    public static String timeDifference(long startTime, long endTime) {

//        long period = 0;
//        int days, hours, min;
//        try {
//            SimpleDateFormat simpleDateFormat = new SimpleDateFormat(_timeFormat);
//            String _startDate = simpleDateFormat.format(startTime);
//            String _endDate = simpleDateFormat.format(endTime);
//            Date date1 = simpleDateFormat.parse(_startDate);
//            Date date2 = simpleDateFormat.parse(_endDate);
//
//            long difference = date2.getTime() - date1.getTime();
//            days = (int) (difference / (1000 * 60 * 60 * 24));
//            hours = (int) ((difference - (1000 * 60 * 60 * 24 * days)) / (1000 * 60 * 60));
//            min = (int) (difference - (1000 * 60 * 60 * 24 * days) - (1000 * 60 * 60 * hours)) / (1000 * 60);
//            hours = (hours < 0 ? -hours : hours);
////            Log.i("======= Hours"," :: "+hours);
////            period = (hours + ":" + min);
//            final Calendar calendar = Calendar.getInstance();
//            calendar.set(Calendar.HOUR_OF_DAY, hours);
//            calendar.set(Calendar.MINUTE, min);
//            calendar.set(Calendar.SECOND, 0);
//            calendar.set(Calendar.MILLISECOND, 0);
//            period = calendar.getTimeInMillis();
////            period = setTimeFormat(hours, min, 00);
//        } catch (ParseException e) {
//            e.printStackTrace();
//        }
//
//        return period;

        try {
            SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", FmUtilize._arabicFormat);
            String _startDate = sdf.format(startTime);
            String _endDate = sdf.format(endTime);

            Date date1 = sdf.parse(_startDate);
            Date date2 = sdf.parse(_endDate);

            long millis = date1.getTime() - date2.getTime();
            int hours = (int) (millis / (1000 * 60 * 60));
            int mins = (int) ((millis / (1000 * 60)) % 60);

            String formattedTime = String.format(FmUtilize._arabicFormat, "%d:%02d",
                    Math.abs(hours), Math.abs(mins));
//
//             return Math.abs(hours) + ":" + Math.abs(mins);
            return formattedTime;
        } catch (ParseException e) {
            e.printStackTrace();
        }

        return "";
    }

    public static String getTDateFormat(Date date) {
        SimpleDateFormat ISO_8601_FORMAT = new SimpleDateFormat(_dateFormat, Locale.ENGLISH);
        return ISO_8601_FORMAT.format(date);

    }

    public static String getDayName(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat("EEEE", new Locale("ar"));
//        DateFormat format = new SimpleDateFormat("EEEE yyyy/MM/dd", new Locale("ar"));
        String dayOfTheWeek = sdf.format(date);
        return dayOfTheWeek;
    }

    public static String getShortEnDayName() {
        Calendar calendar = Calendar.getInstance();
        Date date = calendar.getTime();
//        Log.d(TAG, "3 letter name form of the day : " + new SimpleDateFormat("EE", Locale.ENGLISH).format(date.getTime()));
//        Log.d(TAG, "full name form of the day : " + new SimpleDateFormat("EEEE", Locale.ENGLISH).format(date.getTime()));
        String dayOfTheWeek = new SimpleDateFormat("EE", Locale.ENGLISH).format(date.getTime());
        return dayOfTheWeek;
    }

    public static String getFullDayName(int day) {
        Calendar c = Calendar.getInstance();
        // date doesn't matter - it has to be a Monday
        // I new that first August 2011 is one ;-)
        c.set(2011, 7, 1, 0, 0, 0);
        c.add(Calendar.DAY_OF_MONTH, day);
        return String.format("%tA", c);
    }

    public static String formatCount(long value) {
        //Long.MIN_VALUE == -Long.MIN_VALUE so we need an adjustment here
        if (value == Long.MIN_VALUE) return formatCount(Long.MIN_VALUE + 1);
        if (value < 0) return "-" + formatCount(-value);
        if (value < 1000) return Long.toString(value); //deal with easy case

        Map.Entry<Long, String> e = suffixes.floorEntry(value);
        Long divideBy = e.getKey();
        String suffix = e.getValue();

        long truncated = value / (divideBy / 10); //the number part of the output times 10
        boolean hasDecimal = truncated < 100 && (truncated / 10d) != (truncated / 10);
        return hasDecimal ? (truncated / 10d) + suffix : (truncated / 10) + suffix;
    }

    public static String getAppName(Context context) {
        ApplicationInfo applicationInfo = context.getApplicationInfo();
        int stringId = applicationInfo.labelRes;
        return stringId == 0 ? applicationInfo.nonLocalizedLabel.toString() : context.getString(stringId);
    }

    public synchronized static String deviceId(Context context) {
        if (uniqueID == null) {
            SharedPreferences sharedPrefs = context.getSharedPreferences(
                    PREF_UNIQUE_ID, Context.MODE_PRIVATE);
            uniqueID = sharedPrefs.getString(PREF_UNIQUE_ID, null);
            if (uniqueID == null) {
                uniqueID = UUID.randomUUID().toString();
                SharedPreferences.Editor editor = sharedPrefs.edit();
                editor.putString(PREF_UNIQUE_ID, uniqueID);
                editor.commit();
            }
        }
        return uniqueID;
    }


//    public class StoreObject<T extends Episode> {
//        public T object = null;
//        // alternatively: public BaseObject object = null;
//        // that will allow for object to be any subclass of BaseObject
//        public ArrayList<T> list = null;
//    }
//    StoreObject<Episode> store = new StoreObject<>();


    public static void enableDisableView(View view, boolean enabled) {
        view.setEnabled(enabled);
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;

            for (int idx = 0; idx < group.getChildCount(); idx++) {
                enableDisableView(group.getChildAt(idx), enabled);
            }
        }

        Log.d(TAG, "Error is " + enabled);
    }

    public static Bitmap decodeUri(Context c, Uri uri, final int requiredSize)
            throws FileNotFoundException {
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inJustDecodeBounds = true;
        BitmapFactory.decodeStream(c.getContentResolver().openInputStream(uri), null, o);

        int width_tmp = o.outWidth, height_tmp = o.outHeight;
        int scale = 1;

        while (true) {
            if (width_tmp / 2 < requiredSize || height_tmp / 2 < requiredSize)
                break;
            width_tmp /= 2;
            height_tmp /= 2;
            scale *= 2;
        }

        BitmapFactory.Options o2 = new BitmapFactory.Options();
        o2.inSampleSize = scale;
        return BitmapFactory.decodeStream(c.getContentResolver().openInputStream(uri), null, o2);
    }

    public static boolean isEmpty(String value) {
        return value == null || value.trim().length() == 0;
//        return (value != null || !value.isEmpty());
    }

    public static boolean isEmpty(Collection coll) {
        return (coll == null || coll.isEmpty());
    }

    public static void showMessage(Context activity, String message) {
        Toast toast = Toast.makeText(activity, message, Toast.LENGTH_SHORT);
        View view = toast.getView();
        toast.show();
    }

    public static String getNewId() {
        Random random = new Random();
        return ("Emp-" + String.format("%04d", random.nextInt(10000)));
    }

    public static void shareApp(Context context) {
        String appName = context.getResources().getString(R.string.app_name);
        String appSlogan = context.getResources().getString(R.string.app_slogan);
        Intent sendIntent = new Intent();
        sendIntent.setAction(Intent.ACTION_SEND);
        sendIntent.putExtra(Intent.EXTRA_SUBJECT, "تطبيق " + appName);
        sendIntent.putExtra(Intent.EXTRA_TEXT, appName + " : " + appSlogan + "\n\n" +
//        sendIntent.putExtra(Intent.EXTRA_TEXT,appName +  "  " + "#الكل_عندنا " +
                "حمل التطبيق الآن : " + "\n" + "https://play.google.com/store/apps/details?id=" + BuildConfig.APPLICATION_ID);
        sendIntent.setType("text/plain");
        context.startActivity(sendIntent);
    }


    public static void shareRadioProgram(Context context, RadioProgram obj) {
        String appName = context.getResources().getString(R.string.app_name);
        Intent sendIntent = new Intent();
        sendIntent.setAction(Intent.ACTION_SEND);
        sendIntent.putExtra(Intent.EXTRA_SUBJECT, "تطبيق " + appName);
        sendIntent.putExtra(Intent.EXTRA_TEXT, "تطبيق " + appName + "\n" +
                "- برنامج : " + obj.getPrName() + "\n" +
                "- الوصف  : " + obj.getPrDesc() + "\n" +
                "- حمل التطبيق الآن : " + "\n" + "https://play.google.com/store/apps/details?id=" + BuildConfig.APPLICATION_ID);
        sendIntent.setType("text/plain");
        context.startActivity(sendIntent);
    }

//    public static void shareEpisode(Context context, Episode obj) {
//
//        String appName = context.getResources().getString(R.string.app_name);
//        Intent sendIntent = new Intent();
//        sendIntent.setAction(Intent.ACTION_SEND);
//        sendIntent.putExtra(Intent.EXTRA_SUBJECT, "تطبيق " + appName);
//        sendIntent.putExtra(Intent.EXTRA_TEXT, "تطبيق " + appName + "\n" +
//                "- إسم البرنامج : " + obj.getEpName()
//                + "\n" + "- مقدم البرنامج : " + obj.getEpAnnouncer() + "\n"
//                + "- وقت بث البرنامج : " + getFormatedDateTime(obj.getEpStartAt()) + " - " + getFormatedDateTime(obj.getEpEndAt()) +
//                "\n" + "- تاريخ بث البرنامج : " + Tools.getFormattedDateEvent(FmUtilize.stringToDate(obj.getBroadcastDateAt())) + "\n" +
//                "\n" + "- حمل التطبيق الآن : " + "\n" + "https://play.google.com/store/apps/details?id=" + BuildConfig.APPLICATION_ID + "\n");
//        sendIntent.setType("text/plain");
//        context.startActivity(sendIntent);
//    }

    /**
     * Null-safe check if the specified collection is empty.
     * <p>
     * Null returns true.
     *
     * @param obj the collection to check, may be null
     * @return true if empty or null
     * @since Commons Collections 3.2
     */
    public static boolean isCollection(Object obj) {
        if (obj != null)
            return obj.getClass().isArray() || obj instanceof Collection;
//        return (coll == null || coll.isEmpty());

        return false;
    }

    public static <T> T generateFrom(T... variants) {
        int index = rand.nextInt(variants.length);
        return variants[index];
    }

    public static String getTimeAgo(long time, Context ctx) {
        if (time < 1000000000000L) {
            //if timestamp given in seconds, convert to millis time *= 1000;
        }

        long now = System.currentTimeMillis();
        if (time > now || time <= 0) {
            return null;
        }

        final long diff = now - time;

        if (diff < MINUTE_MILLIS) {
            return "الآن";
        } else if (diff < 2 * MINUTE_MILLIS) {
            return "قبل دقيقة";
        } else if (diff < 50 * MINUTE_MILLIS) {
            return String.format("قبل %s دقيقة", diff / MINUTE_MILLIS);
        } else if (diff < 90 * MINUTE_MILLIS) {
            return "قبل ساعة";
        } else if (diff < 24 * HOUR_MILLIS) {
            return String.format("قبل %s ساعة", diff / HOUR_MILLIS);
        } else if (diff < 48 * HOUR_MILLIS) {
            return "بالأمس";
        } else {
            return String.format("قبل %s يوم", diff / DAY_MILLIS);
        }
    }

    public static Date stringToDate(String string) {
        if (!FmUtilize.isEmpty(string))
            try {
                final Locale locale = Locale.ENGLISH;
                ThreadLocal formater = new ThreadLocal() {
                    protected SimpleDateFormat initialValue() {
                        return new SimpleDateFormat(_dateFormat, locale);
                    }
                };
                return ((SimpleDateFormat) formater.get()).parse(string);
            } catch (Exception e) {
                e.printStackTrace();
            }
        return null;
    }

//    public static String getTimeFormat(long millis) {
////        String hms = String.format("%02d:%02d:%02d", TimeUnit.MILLISECONDS.toHours(millis),
////                TimeUnit.MILLISECONDS.toMinutes(millis) % TimeUnit.HOURS.toMinutes(1),
////                TimeUnit.MILLISECONDS.toSeconds(millis) % TimeUnit.MINUTES.toSeconds(1));
////        return hms;
////        long s = millis % 60;
////        long m = (millis / 60) % 60;
////        long h = (millis / (60 * 60)) % 24;
////        return String.format("%d:%02d:%02d", h,m,s);
//        // New date object from millis
//        Date date = new Date(millis);
//// formattter
//        SimpleDateFormat formatter= new SimpleDateFormat("HH:mm:ss", FmUtilize._arabicFormat);
//        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
//// Pass date object
//        return  formatter.format(date );
//    }

    @NonNull
    public static String random() {
        Random generator = new Random();
        StringBuilder randomStringBuilder = new StringBuilder();
        int randomLength = generator.nextInt(10);
        char tempChar;
        for (int i = 0; i < randomLength; i++) {
            tempChar = (char) (generator.nextInt(96) + 32);
            randomStringBuilder.append(tempChar);
        }
        return randomStringBuilder.toString();
    }

    public static Date _parseDate(String date) {
        SimpleDateFormat inputParser = new SimpleDateFormat(_timeFormat, Locale.US);
        try {
            return inputParser.parse(date);
        } catch (ParseException e) {
            return new Date(0);
        }
    }

    public static boolean isNowBetweenDateTime(long from, long to) {
        try {
//            SimpleDateFormat displayFormat = new SimpleDateFormat("HH:mm:ss");
            SimpleDateFormat parseFormat = new SimpleDateFormat(_timeFormat);
//            Date date = parseFormat.parse("5:35 PM");
//            String d = parseFormat.format(date) + " = " + displayFormat.format(date);
            String str = parseFormat.format(new Date());
            Date date_from = new Date(from);// parseFormat.parse(from);
            Date date_to = new Date(to);//  parseFormat.parse(to);
//            Date dateNow = parseFormat.parse("4:35 PM");
            Date dateNow = parseFormat.parse(str);
//            String from = "5:10:00";
//            String to = "10:10:00";
//            String n = "08:10:00";
//            Date date_from = displayFormat.parse(from);
//            Date date_to = displayFormat.parse(to);
//            Date dateNow = displayFormat.parse(n);
            if (date_from.before(dateNow) && date_to.after(dateNow)) {
                return true;
            }
        } catch (ParseException e) {
            e.printStackTrace();
        }
        return false;
    }


    public static Bitmap getBitmap(ImageView view) {

        Bitmap bitmap = Bitmap.createBitmap(view.getWidth(), view.getHeight(), Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Drawable bgDrawable = view.getBackground();
        if (bgDrawable != null) {
            bgDrawable.draw(canvas);
        } else {
            canvas.drawColor(Color.parseColor("#212121"));
        }
        view.draw(canvas);

        return bitmap;
    }

    /**
     * Validation of Phone Number
     */
    public final static boolean isValidPhoneNumber(CharSequence target) {
        if (target == null || target.length() < 7 || target.length() > 13) {
            return false;
        } else {
            return android.util.Patterns.PHONE.matcher(target).matches();
        }
    }

    public static String getImageUUID() {
        return UUID.randomUUID().toString();
    }

    public final static boolean isValidMobile(String phone) {
        return android.util.Patterns.PHONE.matcher(phone).matches();
    }

    public final static Map<String, Object> pojo2Map(Object obj) {
//        Map<String, Object> hashMap = new HashMap<String, Object>();
        Gson gson = new GsonBuilder().create();
        String json = gson.toJson(obj);// obj is your object
        Map<String, Object> result = new Gson().fromJson(json, Map.class);
        return result;
    }

    public static String getSecret(int size) {
        byte[] secret = getSecretBytes(size);
        return secret.toString();// Base64.encodeBytes(secret);
    }

    public static byte[] getSecretBytes(int size) {
        return getSecretBytes(new SecureRandom(), size);
    }

    public static byte[] getSecretBytes(@NonNull SecureRandom secureRandom, int size) {
        byte[] secret = new byte[size];
        secureRandom.nextBytes(secret);
        return secret;
    }

    public static String trimMobileCode(String mobile) {
//        if (mobile != null && mobile.trim().length() >= 12)
//            return mobile.substring(3);
//        return mobile;

        if (mobile.length() == 9) {
            return mobile;
        } else if (mobile.length() > 9) {
            return mobile.substring(mobile.length() - 9);
        } else {
            // whatever is appropriate in this case
            //throw new IllegalArgumentException("word has fewer than 3 characters!");
            return mobile;
        }
    }

    public String getLastThree(String myString) {
        if (myString.length() > 3)
            return myString.substring(myString.length() - 3);
        else
            return myString;
    }

    private void launchMarket(Context context) {
        Uri uri = Uri.parse("market://details?id=" + context.getPackageName());
        Intent myAppLinkToMarket = new Intent(Intent.ACTION_VIEW, uri);
        try {
            context.startActivity(myAppLinkToMarket);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(context, " unable to find market app", Toast.LENGTH_LONG).show();
        }
    }

    public static String modifyDateLayout(String inputDate) {
        String res = "null";
        try {
            SimpleDateFormat sdf = new SimpleDateFormat(DATE_TIME_FORMAT, Locale.US);
            Date date = sdf.parse(inputDate);
            res = new SimpleDateFormat("dd.MM.yyyy HH:mm:ss").format(date);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return res;
    }

    public static String modifyDateLayout(long val) {
        String res = "";
        try {
            SimpleDateFormat sdf = new SimpleDateFormat(DATE_TIME_FORMAT, Locale.US);
            System.out.format("%30s %s\n", "yyyy-MM-dd'T'HH:mm:ss.SSSZ", sdf.format(new Date(val))); // 0 - your "LongValue"
            res = sdf.format(new Date(val));
        } catch (Exception e) {
            e.printStackTrace();
        }
        return res;
    }


//    public final static  boolean isValidMobile(String phone) {
//        if(!Pattern.matches("[a-zA-Z]+", phone)) {
//            return phone.length() > 6 && phone.length() <= 13;
//        }
//        return false;
//    }

    private boolean isValidMail(String email) {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches();
    }

    public String createTransactionID() throws Exception {
        return UUID.randomUUID().toString().replaceAll("-", "").toUpperCase();
    }


    public static String getFileName(Uri imageUri, Activity activity) {
        String result = null;
        if (imageUri.getScheme().equals("content")) {
            Cursor cursor = activity.getContentResolver().query(imageUri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    result = cursor.getString(cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME));
                }
            } finally {
                cursor.close();
            }
        }
        if (result == null) {
            result = imageUri.getPath();
            int cut = result.lastIndexOf('/');
            if (cut != -1) {
                result = result.substring(cut + 1);
            }
        }
        return result;
    }


    public static Intent getOpenFacebookIntent(Context context) {

//        try {
//            context.getPackageManager().getPackageInfo("com.facebook.katana", 0);
//            return new Intent(Intent.ACTION_VIEW, Uri.parse("fb://page/HudhudFm"));
//        } catch (Exception e) {
        return new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.facebook.com/HudhudFm"));
//        }
    }

    public static Intent getOpenTwitterIntent(Context context) {

        try {
            context.getPackageManager().getPackageInfo("com.twitter.android", 0);
            return new Intent(Intent.ACTION_VIEW, Uri.parse("twitter://user?user_id=HudhudFm"));
        } catch (Exception e) {
            return new Intent(Intent.ACTION_VIEW, Uri.parse("https://twitter.com/HudhudFm"));
        }
    }

    private boolean ItemContactUs(Context context, String email) {

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
        Intent chooser = Intent.createChooser(contactUsIntent, context.getString(R.string
                .select_email_app));
        context.startActivity(chooser);
        return false;
    }

    public static List safeList(List other) {
        return other == null ? Collections.EMPTY_LIST : other;
    }

    private static ArrayList<WakeTranslate> arList() {
        ArrayList<WakeTranslate> arList = new ArrayList<WakeTranslate>();
        arList.add(new WakeTranslate("Sun", "الأحد"));
        arList.add(new WakeTranslate("Mon", "الإثنين"));
        arList.add(new WakeTranslate("Tue", "الثلاثاء"));
        arList.add(new WakeTranslate("Wed", "الأربعاء"));
        arList.add(new WakeTranslate("Thu", "الخميس"));
        arList.add(new WakeTranslate("Fri", "الجمعة"));
        arList.add(new WakeTranslate("Sat", "السبت"));
        return arList;
    }


    public static ArrayList<WakeTranslate> translateWakeDaysAr(List<String> enList) {
//        int itemIndex = enList.indexOf(item);
//        if (itemIndex != -1) {
//            enList.set(itemIndex, item);
//        }

//        ArrayList<String> enList = new ArrayList<>();
//        enList.add("Sun");
//        enList.add("Mon");
//        enList.add("Thu");
//        enList.add("Wed");
//        enList.add("Thu");
//        enList.add("Fri");
//        enList.add("Sat");


        ArrayList<WakeTranslate> results = new ArrayList<>();

        // Loop arrayList2 items
        for (String enName : enList) {
            // Loop arrayList1 items
//            boolean found = false;
            for (WakeTranslate wt : arList()) {
                if (enName.equals(wt.getDayKey())) {
//                    found = true;
                    results.add(wt);
                }
            }
//            if (!found) {
//                LogUtility.e("translateWakeDays not found : ",enName);
//            }
        }

        return results;
    }

    public static ArrayList<String> translateWakeDaysEn(List<String> list) {
//        ArrayList<WakeTranslate> results = new ArrayList<>();
        ArrayList<String> enList = new ArrayList<>();

        // Loop arrayList2 items
        for (String arName : list) {
            // Loop arrayList1 items
//            boolean found = false;
            for (WakeTranslate wt : arList()) {
                if (arName.equals(wt.getDayName())) {
//                    found = true;
                    enList.add(wt.getDayKey());
                }
            }
//            if (!found) {
//                LogUtility.e("translateWakeDays not found : ",enName);
//            }
        }

        return enList;
    }


    public static String[] getWeekDayNames() {
        String[] names = DateFormatSymbols.getInstance(Locale.ENGLISH).getShortWeekdays();
        List<String> daysName = new ArrayList<>(Arrays.asList(names));
        daysName.remove(0);

        //unComment bellow line if you want a start day Monday
//        daysName.add(daysName.remove(0));

        for (int i = 0; i < daysName.size(); i++)
            //(0,3 MON) (0,1 M) (comment ".substring(0,3)" for full length of the day)
            daysName.set(i, daysName.get(i).substring(0, 3));
        names = new String[daysName.size()];
        daysName.toArray(names);
        return names;

    }


    private static Object getValue(Properties props, String name) {
        String propertyValue = props.getProperty(name);
        if (propertyValue == null) {
            throw new IllegalArgumentException("Missing configuration value: " + name);
        } else {
            String[] parts = name.split(":");
            switch (parts[0]) {
                case "STRING":
                    return parts[1];
                case "BOOLEAN":
                    return Boolean.parseBoolean(parts[1]);
                default:
                    throw new IllegalArgumentException("Unknown configuration value type: " + parts[0]);
            }
        }
    }

    public static <E> void removeNulls(ArrayList<E> list) {
        int size = list.size();
        int read = 0;
        int write = 0;
        for (; read < size; read++) {
            E element = list.get(read);
            if (element == null) continue;
            if (read != write) list.set(write, element);
            write++;
        }
        if (write != size) {
            list.subList(write, size).clear();
        }
    }


    public static boolean isGooglePlayServicesAvailable(Activity activity) {
        GoogleApiAvailability googleApiAvailability = GoogleApiAvailability.getInstance();
        int status = googleApiAvailability.isGooglePlayServicesAvailable(activity);
        if (status != ConnectionResult.SUCCESS) {
            if (googleApiAvailability.isUserResolvableError(status)) {
                googleApiAvailability.getErrorDialog(activity, status, 2404).show();
            }
            return false;
        }
        return true;
    }

    public static String getIMEIDeviceId(Context context) {

        String deviceId;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            deviceId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
        } else {
            final TelephonyManager mTelephony = (TelephonyManager) context.getSystemService(Context.TELEPHONY_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (context.checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
                    return "";
                }
            }
            assert mTelephony != null;
            if (mTelephony.getDeviceId() != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    deviceId = mTelephony.getImei();
                } else {
                    deviceId = mTelephony.getDeviceId();
                }
            } else {
                deviceId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            }
        }
        Log.d("deviceId", deviceId);
        return deviceId;
    }


    public static String getFirebaseToken(Context context) {
//        return PreferencesManager.getInstance().write(FirebaseConstants.DEVICE_TOKEN,null);
        return context.getSharedPreferences(PreferencesManager.PREF_NAME, MODE_PRIVATE).getString(FirebaseConstants.DEVICE_TOKEN, null);
    }


//    public boolean checkFieldsIsNull(Object instance, List<String> fieldNames) {
//
//        return fieldNames.stream().allMatch(field -> {
//            try {
//                return Objects.isNull(instance.getClass().getDeclaredField(field).get(instance));
//            } catch (IllegalAccessException | NoSuchFieldException e) {
//                return true;//You can throw RuntimeException if need.
//            }
//        });
//    }
}

//    String[] values = {"AB","BC","CD","AE"};
//    boolean contains = Arrays.stream(values).anyMatch("s"::equals);


//public final class Config {
//    public final int CONST_1;
//    public final String CONST_2;
//
//    public Config(File file) throws IOException {
//        try (Scanner s = new Scanner(file)) {
//            CONST_1 = s.nextInt();
//            CONST_2 = s.next();
//        }
//    }
//}


