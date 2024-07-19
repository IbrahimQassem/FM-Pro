//package com.sana.dev.fm.utils;
//
//import android.app.DatePickerDialog;
//import android.app.TimePickerDialog;
//import android.content.Context;
//
//import java.util.Calendar;
//
//public class DialogTimePickerHelper {
//
//    private Context context;
//    private OnDateTimeSelectedListener listener;
//    private Calendar initialDateTime;
//
//    public interface OnDateTimeSelectedListener {
//        void onDateTimeSelected(Calendar selectedDateTime);
//    }
//
//    public DialogTimePickerHelper(Context context, Calendar initialDateTime, OnDateTimeSelectedListener listener) {
//        this.context = context;
//        this.initialDateTime = initialDateTime;
//        this.listener = listener;
//    }
//
//    private void showTimePickerDialog(Calendar initialDateTime) {
//        this.initialDateTime = initialDateTime;
//        int hour = initialDateTime.get(Calendar.HOUR_OF_DAY);
//        int minute = initialDateTime.get(Calendar.MINUTE);
//
//        TimePickerDialog timePickerDialog = new TimePickerDialog(context, (view, hourOfDay, m) -> {
//            initialDateTime.set(Calendar.HOUR_OF_DAY, hourOfDay);
//            initialDateTime.set(Calendar.MINUTE, m);
//            listener.onDateTimeSelected(initialDateTime);
//        }, hour, minute, true); // true for 24-hour format
//        timePickerDialog.show();
//    }
//
//    private void showDatePickerDialog() {
//        int year = initialDateTime.get(Calendar.YEAR);
//        int month = initialDateTime.get(Calendar.MONTH);
//        int day = initialDateTime.get(Calendar.DAY_OF_MONTH);
//
//        DatePickerDialog datePickerDialog = new DatePickerDialog(context, (view, yer, monthOfYear, dayOfMonth) -> {
//            initialDateTime.set(Calendar.YEAR, yer);
//            initialDateTime.set(Calendar.MONTH, monthOfYear);
//            initialDateTime.set(Calendar.DAY_OF_MONTH, dayOfMonth);
//            showTimePickerDialog(initialDateTime);
//        }, year, month, day);
//        datePickerDialog.show();
//    }
//
//    public void showDatePickerDialog(OnDateSelectedListener listener) {
//        Calendar calendar = Calendar.getInstance();
//        int year = calendar.get(Calendar.YEAR);
//        int month = calendar.get(Calendar.MONTH);
//        int day = calendar.get(Calendar.DAY_OF_MONTH);
//
//        DatePickerDialog datePickerDialog = new DatePickerDialog(context, (view, yer, monthOfYear, dayOfMonth) -> {
//            calendar.set(Calendar.YEAR, yer);
//            calendar.set(Calendar.MONTH, monthOfYear);
//            calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);
//            listener.onDateSelected(calendar);
//        }, year, month, day);
//        datePickerDialog.show();
//    }
//
//    public interface OnDateSelectedListener {
//        void onDateSelected(Calendar selectedDate);
//    }
//
//    public interface OnTimeSelectedListener {
//        void onTimeSelected(int hour, int minute);
//    }
//
//    public void displayCurrentTime(OnTimeSelectedListener onTimeSelectedListener) {
//        Calendar calendar = Calendar.getInstance();
//        int hour = calendar.get(Calendar.HOUR_OF_DAY);
//        int minute = calendar.get(Calendar.MINUTE);
//
//        TimePickerDialog timePickerDialog = new TimePickerDialog(context, (view, hourOfDay, minuteOfDay) -> {
//            // Do nothing, just use the current time
//        }, hour, minute, true); // true for 24-hour format
//        timePickerDialog.setOnCancelListener(dialog -> {
//            // Update the TextView with the current time
//            onTimeSelectedListener.onTimeSelected(hour, minute);
//        });
//        timePickerDialog.show();
//    }
//
//}
