package com.sana.dev.fm.model;


import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.utils.Tools;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class DateTimeModel {
    long dateStart, dateEnd, timeStart, timeEnd;
    List<Weekday> weekdays;
    boolean asMainTime;


    public DateTimeModel() {
        super();
    }

    public DateTimeModel(long dateStart, long dateEnd, long timeStart, long timeEnd) {
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.timeStart = timeStart;
        this.timeEnd = timeEnd;
    }

    public DateTimeModel(long dateStart, long dateEnd, List<Weekday> displayDay) {
        this.dateStart = dateStart;
        this.dateEnd = dateEnd;
        this.weekdays = displayDay;
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
            idd = vv.isIn(toCheck);
            //is toCheck between the two?
            isTimeAvailable = (before.getTime() < toCheck.getTime()) && after.getTime() > toCheck.getTime();
        } catch (ParseException e) {
            e.printStackTrace();
        }

        idd = idd;
        return isTimeAvailable;
    }


    // Todo
    public static long findMainShowTime(List<DateTimeModel> list) {
//        DateTimeModel timeModel = new DateTimeModel();
        long time = 0;
        if (!Tools.isEmpty(list)) {
            for (DateTimeModel dateTimeModel : list) {
                if (dateTimeModel.isAsMainTime()) {
//                timeModel = dateTimeModel;
                    time = dateTimeModel.getTimeStart();
                    break;
                }
            }
        }
        return time;
    }


    public static boolean useLoop(String[] arr, String targetValue) {
        for (String s : arr) {
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

    public List<Weekday> getWeekdays() {
        return weekdays;
    }

    public void setWeekdays(List<Weekday> weekdays) {
        this.weekdays = weekdays;
    }

    public boolean isAsMainTime() {
        return asMainTime;
    }

    public void setAsMainTime(boolean asMainTime) {
        this.asMainTime = asMainTime;
    }
}

class TimePeriod implements Comparable<TimePeriod> {

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