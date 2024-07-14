package com.sana.dev.fm.ui.dialog;

import android.app.AlertDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.widget.ArrayAdapter;
import android.widget.ListView;

import com.sana.dev.fm.R;
import com.sana.dev.fm.model.WakeTranslate;
import com.sana.dev.fm.model.enums.Weekday;
import com.sana.dev.fm.utils.FmUtilize;

import java.util.ArrayList;
import java.util.List;

public class WeekdayDialog {

    private Context context;

    private Weekday[] weekdays = Weekday.values();
    private boolean[] checkedItems;

    public WeekdayDialog(Context context) {
        this.context = context;
        checkedItems = new boolean[weekdays.length];
    }


    public void showDialog(final OnWeekdaySelectedListener listener) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(context.getString(R.string.label_select_weekdays));

        // Create a list view with checkboxes
        ListView listView = new ListView(context);
        ArrayAdapter<Weekday> adapter = new ArrayAdapter<Weekday>(context, android.R.layout.simple_list_item_multiple_choice, weekdays);
        listView.setChoiceMode(ListView.CHOICE_MODE_MULTIPLE);
        listView.setAdapter(adapter);

        // Set checked items (optional)
        builder.setView(listView);

        builder.setPositiveButton(context.getString(R.string.label_sound_good), new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                // Get selected weekdays
                for (int i = 0; i < checkedItems.length; i++) {
                    checkedItems[i] = listView.isItemChecked(i);
                }
                listener.onWeekdaysSelected(checkedItems);
            }
        });
        builder.setNegativeButton(context.getString(R.string.label_cancel), null);
        builder.show();
    }

//    private String[] getWeekdayNames(Weekday[] weekdays) {
//        String[] weekdayNames = new String[weekdays.length];
//        for (int i = 0; i < weekdays.length; i++) {
//            Weekday checkedDay = weekdays[i]; // Assuming weekdays is defined as in the previous response
//            String localizedDayName = FmUtilize.getLocalizedDayName(checkedDay, "ar");// Arabic
//            String englishDayName = FmUtilize.getLocalizedDayName(checkedDay, "en");// En
//            weekdayNames[i] = localizedDayName;
//        }
//        return weekdayNames;
//    }

    public interface OnWeekdaySelectedListener {
        void onWeekdaysSelected(boolean[] checkedItems);
    }


}
