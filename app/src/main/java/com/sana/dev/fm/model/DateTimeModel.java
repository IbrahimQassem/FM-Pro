package com.sana.dev.fm.model;


import androidx.core.util.Predicate;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

public class DateTimeModel {
    long dateStart, dateEnd, timeStart, timeEnd;
    List<String> displayDays;//= DateFormatSymbols.getInstance(Locale.getDefault()).getShortWeekdays();
    boolean isItMainTime;


    public DateTimeModel() {
        super();
    }

    public DateTimeModel(long dateStart, long dateEnd, long timeStart, long timeEnd) {
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.timeStart = timeStart;
        this.timeEnd = timeEnd;
    }


    public DateTimeModel(long dateStart, long dateEnd, List<String> displayDay) {
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.displayDays = displayDay;
    }

//    public boolean contains(List<String> _displayDays, String dayName) {
//        boolean isContain = _displayDays.contains(dayName);
//        return isContain;
//    }

    public DateTimeModel(long timeStart, long timeEnd, boolean isItMainTime) {
        this.timeStart = timeStart;
        this.timeEnd = timeEnd;
        this.isItMainTime = isItMainTime;
    }

    public boolean isWithinRange(DateTimeModel model) {
        long now = System.currentTimeMillis();
        Date targetDate = new Date(now);
        Date startDate = new Date(model.getTimeStart());
        Date endDate = new Date(model.getTimeEnd());
        boolean isTimeAvailable = false;
        boolean idd = false;
        try {

            SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.ENGLISH);
            String _startDate = sdf.format(startDate);
            String _endDate = sdf.format(endDate);
            String _targetDate = sdf.format(targetDate);

//            LogUtility.e("Time  ","_startDate : "+ _startDate +"_endDate : "+ _endDate +"_targetDate : "+ _targetDate );

            Date before = sdf.parse(_startDate);
            Date after = sdf.parse(_endDate);
            Date toCheck = sdf.parse(_targetDate);

            TimePeriod vv = new TimePeriod();
            vv.start = before;
            vv.end = after;
            idd =  vv.isIn(toCheck);
            //is toCheck between the two?
            isTimeAvailable = (before.getTime() < toCheck.getTime()) && after.getTime() > toCheck.getTime();
        } catch (ParseException e) {
            e.printStackTrace();
        }

        idd  = idd;
        return isTimeAvailable;
    }



    public static long findMainShowTime( List<DateTimeModel> list){
//        DateTimeModel timeModel = new DateTimeModel();
        long time = 0;
        for (DateTimeModel dateTimeModel : list) {
            if (dateTimeModel.isItMainTime()) {
//                timeModel = dateTimeModel;
                time = dateTimeModel.getTimeStart();
                break;
            }
        }
        return  time;
    }



    public static boolean useLoop(String[] arr, String targetValue) {
        for (String s: arr) {
            if (s.equals(targetValue))
                return true;
        }
        return false;
    }

    public long getDateStart() {
        return dateStart;
    }

    public void setDateStart(long dateStart) {
        this.dateStart = dateStart;
    }

    public long getDateEnd() {
        return dateEnd;
    }

    public void setDateEnd(long dateEnd) {
        this.dateEnd = dateEnd;
    }

    public long getTimeStart() {
        return timeStart;
    }

    public void setTimeStart(long timeStart) {
        this.timeStart = timeStart;
    }

    public long getTimeEnd() {
        return timeEnd;
    }

    public void setTimeEnd(long timeEnd) {
        this.timeEnd = timeEnd;
    }

    public List<String> getDisplayDays() {
        return displayDays;
    }

    public void setDisplayDays(List<String> displayDays) {
        this.displayDays = displayDays;
    }

    public boolean isItMainTime() {
        return isItMainTime;
    }

    public void setItMainTime(boolean itMainTime) {
        isItMainTime = itMainTime;
    }
}

class TimePeriod implements Comparable<TimePeriod>{

    Date start;
    Date end;

    //Constructor, getters, setters

    boolean isIn(Date date) {
        return date.after(start) && date.before(end);
    }

    public int compareTo(TimePeriod other) {
        return start.compareTo(other.start);
    }
}