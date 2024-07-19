package com.sana.dev.fm.utils;

import android.text.TextUtils;

import com.sana.dev.fm.model.enums.Weekday;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

public class WeekdayUtils {
    //    private static final Map<String, Weekday> weekdayMap = new EnumMap(Weekday.class);
//
//    static {
//        for (Weekday weekday : Weekday.values()) {
//            weekdayMap.put(weekday.toString(), weekday);
//        }
//    }
    public static String toSeparatedString(Weekday[] weekdays) {
        String joinedString = TextUtils.join(" , ", weekdays);
        return joinedString;
    }

    public static String toSeparatedString(List<Weekday> weekdays) {
        String joinedString = TextUtils.join(" , ", weekdays);
        return joinedString;
    }


    public static ArrayList<Weekday> convertSeparatedWeekdays(String separatedWeekdays, String delimiter) {
        String[] weekdayStrings = separatedWeekdays.split(delimiter);

        ArrayList<Weekday> enList = new ArrayList<>();
        // Loop arrayList2 items
        for (String name : weekdayStrings) {
            // Loop arrayList1 items
            for (Weekday wt : Weekday.values()) {
                String targetName = wt.name().trim().toLowerCase();
                String selectedName = name.trim().toLowerCase();
                if (selectedName.equals(targetName)) {
                    enList.add(wt);
                }
            }
        }
        return enList;
    }

    public static String[] getWeekdayNames(List<Weekday> weekdays,String lang) {
        String[] weekdayNames = new String[weekdays.size()];
        for (int i = 0; i < weekdays.size(); i++) {
            Weekday checkedDay = weekdays.get(i); // Assuming weekdays is defined as in the previous response
            String localizedDayName = getLocalizedDayName(checkedDay, lang);// Arabic
//            String englishDayName = FmUtilize.getLocalizedDayName(checkedDay, "en");// En
            weekdayNames[i] = localizedDayName;
        }
        return weekdayNames;
    }
    public static String[] getWeekdayNames(Weekday[]  weekdays,String lang) {
        String[] weekdayNames = new String[weekdays.length];
        for (int i = 0; i < weekdays.length; i++) {
            Weekday checkedDay = weekdays[i]; // Assuming weekdays is defined as in the previous response
            String localizedDayName = getLocalizedDayName(checkedDay, lang);// Arabic
//            String englishDayName = FmUtilize.getLocalizedDayName(checkedDay, "en");// En
            weekdayNames[i] = localizedDayName;
        }
        return weekdayNames;
    }

    public static String getLocalizedDayName(Weekday weekday, String languageCode)
    {
        switch (languageCode)
        {
            case "ar":
                switch (weekday)
                {
                    case Saturday: return "السبت";
                    case Sunday: return "الأحد";
                    case Monday: return "الاثنين";
                    case Thursday: return "الثلاثاء";
                    case Wednesday: return "الأربعاء";
                    case Tuesday: return "الخميس";
                    case Friday: return "الجمعة";
                    // ... add other Arabic day names
                    default: return weekday.toString();
                }
            case "en":
            default:
                return weekday.toString();
        }
    }

    public static Weekday getCurrentDayOfWeek() {
        Calendar calendar = Calendar.getInstance();
        int dayOfWeek = calendar.get(Calendar.DAY_OF_WEEK);
// Optional: Convert integer to String representation
        Weekday dayString = Weekday.Saturday;
        switch (dayOfWeek) {
            case Calendar.SUNDAY:
                dayString = Weekday.Sunday;
                break;
            case Calendar.MONDAY:
                dayString = Weekday.Monday;
                break;
            case Calendar.TUESDAY:
                dayString = Weekday.Tuesday;
                break;
            case Calendar.WEDNESDAY:
                dayString = Weekday.Wednesday;
                break;
            case Calendar.THURSDAY:
                dayString = Weekday.Thursday;
                break;
            case Calendar.FRIDAY:
                dayString = Weekday.Friday;
                break;
            case Calendar.SATURDAY:
//            default:
//                dayString = Weekday.Saturday;
        }

        // Return the corresponding Weekday enum value
        return dayString;
    }


    public static boolean isCurrentDay(Weekday dayToCheck) {
        return getCurrentDayOfWeek() == dayToCheck;
    }

}