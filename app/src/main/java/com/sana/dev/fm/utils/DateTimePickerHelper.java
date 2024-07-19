package com.sana.dev.fm.utils;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Context;

import java.util.Calendar;

public class DateTimePickerHelper {
    private Context context;
    private OnDateSelectedListener dateListener;
    private OnTimeSelectedListener timeListener;

    public interface OnDateSelectedListener {
        void onDateSelected(Calendar selectedDate);
    }

    public interface OnTimeSelectedListener {
        void onTimeSelected(Calendar selectedTime);
    }

    public DateTimePickerHelper(Context context) {
        this.context = context;
    }

    public void showDatePicker(OnDateSelectedListener listener) {
        this.dateListener = listener;
        Calendar calendar = Calendar.getInstance();
        int year = calendar.get(Calendar.YEAR);
        int month = calendar.get(Calendar.MONTH);
        int day = calendar.get(Calendar.DAY_OF_MONTH);

        DatePickerDialog datePickerDialog = new DatePickerDialog(context, (view, yer, monthOfYear, dayOfMonth) -> {
            calendar.set(Calendar.YEAR, yer);
            calendar.set(Calendar.MONTH, monthOfYear);
            calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
            dateListener.onDateSelected(calendar);
        }, year, month, day);
        datePickerDialog.show();
    }

//    public void showDatePickerz(OnDateSelectedListener listener) {
//        this.dateListener = listener;
//        Calendar calendar = Calendar.getInstance();
//        int year = calendar.get(Calendar.YEAR);
//        int month = calendar.get(Calendar.MONTH);
//        int day = calendar.get(Calendar.DAY_OF_MONTH);
//        DatePickerDialog datePicker = DatePickerDialog.newInstance(
//                (DatePickerDialog.OnDateSetListener) (view, yer, monthOfYear, dayOfMonth) -> {
//                    calendar.set(Calendar.YEAR, yer);
//                    calendar.set(Calendar.MONTH, monthOfYear);
//                    calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
//                    dateListener.onDateSelected(calendar);
//                }, year, month, day);
//        //set dark light
//        datePicker.setThemeDark(false);
//        datePicker.setAccentColor(context.getResources().getColor(R.color.colorPrimary));
//        datePicker.show(((AppCompatActivity) context).getSupportFragmentManager(), context.getString(R.string.label_pick_date));
//    }

    public void showTimePicker(OnTimeSelectedListener listener) {
        this.timeListener = listener;
        Calendar calendar = Calendar.getInstance();
        int hour = calendar.get(Calendar.HOUR_OF_DAY);
        int minute = calendar.get(Calendar.MINUTE);

        TimePickerDialog timePickerDialog = new TimePickerDialog(context, (view, hourOfDay, mint) -> {
            calendar.set(Calendar.HOUR_OF_DAY, hourOfDay);
            calendar.set(Calendar.MINUTE, mint);
            timeListener.onTimeSelected(calendar);
        }, hour, minute, false); // true for 24-hour format
        timePickerDialog.show();

        //set dark light
//        timePickerDialog.setThemeDark(false);
//        timePickerDialog.vibrate(true);
//        timePickerDialog.setLocale(Locale.ENGLISH);
//        timePickerDialog.setAccentColor(getResources().getColor(R.color.colorPrimary));
//        timePickerDialog.show(getSupportFragmentManager(), getString(R.string.label_set_time));
    }
}
