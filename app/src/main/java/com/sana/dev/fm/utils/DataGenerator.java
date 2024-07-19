package com.sana.dev.fm.utils;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.drawable.Drawable;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.DateTimeModel;
import com.sana.dev.fm.model.Episode;
import com.sana.dev.fm.model.RadioProgram;
import com.sana.dev.fm.model.SectionImage;
import com.sana.dev.fm.model.enums.Weekday;

import java.text.DateFormatSymbols;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Random;


@SuppressWarnings("ResourceType")
public class DataGenerator {

    private static final Random r = new Random();

    public static int randInt(int max) {
        int min = 0;
        return r.nextInt((max - min) + 1) + min;
    }




    public static List<RadioProgram> getProgramData(Context ctx) {
        List<RadioProgram> items = new ArrayList<>();
        TypedArray drw_arr = ctx.getResources().obtainTypedArray(R.array.people_images);
        String[] name_arr = ctx.getResources().getStringArray(R.array.people_names);
        String[] category = ctx.getResources().getStringArray(R.array.category);
        String _desc = ctx.getString(R.string.lorem_ipsum);
        String _img = ctx.getString(R.string.url_profile);

        for (int i = 0; i < drw_arr.length(); i++) {
            RadioProgram obj = new RadioProgram();
            int image = drw_arr.getResourceId(i, -1);
            obj.setPrName(name_arr[i]);
            obj.setPrDesc(_desc);
            obj.setPrProfile(_img);
            obj.setPrCategoryList(Arrays.asList(category));
//            obj.setCreatedDate(Tools.getFormattedDateSimple(new Date().getTime()));
            Drawable imageDrw = ctx.getResources().getDrawable(image);
            items.add(obj);
        }
        Collections.shuffle(items);
        return items;
    }

    public static List<Episode> getEpisodeData(Context ctx) {
        List<String> shortWeekDays = Arrays.asList(DateFormatSymbols.getInstance(Locale.ENGLISH).getShortWeekdays());

        List<Episode> items = new ArrayList<>();
        String[] name_arr = ctx.getResources().getStringArray(R.array.sample_images_name);
        String _img = ctx.getString(R.string.url_profile);
        int index;
        for (int i = 0; i < name_arr.length; i++) {
            index = i + 1;
            String _desc = ctx.getString(R.string.label_desc) + " " + name_arr[i] ;
            // Todo : Fix me
//            Episode obj = new Episode("1000", "1000_" + index, "Name :" + index, "1000_" + index + "_" + index, name_arr[i], _desc, name_arr[i], Tools.getFormattedDateSimple(new Date().getTime()), setTimeFormat((i + 1), (i * 3), 33), setTimeFormat((i + 1), (i * 3), 33), "59", _img, "", 100 * i, 1, String.valueOf(System.currentTimeMillis()), "temp", "", false,new DateTimeModel(System.currentTimeMillis(),System.currentTimeMillis(),shortWeekDays));
//            Episode episode = new Episode(""+i, "1000_" + index, ctx.getString(R.string.label_program_name)+ " " + index, "1000_" + index, name_arr[i], _desc, ctx.getString(R.string.label_announcer_name) +" "+  name_arr[i], new DateTimeModel(System.currentTimeMillis(),System.currentTimeMillis(), Weekday.), _img, "http://www.dev2qa.com/demo/media/test.mp3", 1, 1, String.valueOf(System.currentTimeMillis()), "createBy", "", false, new ArrayList<DateTimeModel>(Collections.singleton(new DateTimeModel(System.currentTimeMillis(), System.currentTimeMillis(), shortWeekDays))));
//            items.add(episode);
        }
        Collections.shuffle(items);
        return items;
    }


    public static String formatTime(long time) {
        // income time
        Calendar date = Calendar.getInstance();
        date.setTimeInMillis(time);

        // current time
        Calendar curDate = Calendar.getInstance();
        curDate.setTimeInMillis(System.currentTimeMillis());

        SimpleDateFormat dateFormat = null;
        if (date.get(Calendar.YEAR) == curDate.get(Calendar.YEAR)) {
            if (date.get(Calendar.DAY_OF_YEAR) == curDate.get(Calendar.DAY_OF_YEAR)) {
                dateFormat = new SimpleDateFormat("h:mm a", Locale.US);
            } else {
                dateFormat = new SimpleDateFormat("MMM d", Locale.US);
            }
        } else {
            dateFormat = new SimpleDateFormat("MMM yyyy", Locale.US);
        }
        return dateFormat.format(time);
    }


    public static List<SectionImage> getImageDate(Context ctx) {
        List<SectionImage> items = new ArrayList<>();
        TypedArray drw_arr = ctx.getResources().obtainTypedArray(R.array.sample_images);
        String[] name_arr = ctx.getResources().getStringArray(R.array.sample_images_name);
        String[] date_arr = ctx.getResources().getStringArray(R.array.general_date);
        for (int i = 0; i < drw_arr.length(); i++) {
            SectionImage obj = new SectionImage();
            obj.image = drw_arr.getResourceId(i, -1);
            obj.name = name_arr[i];
            obj.title = date_arr[randInt(date_arr.length - 1)];
            obj.counter = r.nextBoolean() ? randInt(500) : null;
//            obj.imageDrw = ctx.getResources().getDrawable(obj.image);
            items.add(obj);
        }
        Collections.shuffle(items);
        return items;
    }


    public static List<String> getStringsMonth(Context ctx) {
        List<String> items = new ArrayList<>();
        String[] arr = ctx.getResources().getStringArray(R.array.month);
        for (String s : arr) items.add(s);
        Collections.shuffle(items);
        return items;
    }


}
