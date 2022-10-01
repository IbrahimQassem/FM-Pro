package com.sana.dev.fm.utils;


import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.style.StyleSpan;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.TextView;
import android.widget.Toast;

import com.sana.dev.fm.R;


public class CustomToast {

    private TextView toastTextView;

    public static void createToast(Context context, String message, boolean error) {
        Toast toast = new Toast(context);
        View view = LayoutInflater.from(context).inflate(R.layout.customtoast, null);
        TextView toastTextView = view.findViewById(R.id.textViewToast);

        SpannableString spannableString = new SpannableString(message);
        spannableString.setSpan(new StyleSpan(Typeface.BOLD), 0, spannableString.length(), 0);
        spannableString.setSpan(new StyleSpan(Typeface.ITALIC), 0, spannableString.length(), 0);

        toastTextView.setText(spannableString);
        toast.setView(view);
        toast.setDuration(Toast.LENGTH_LONG);

        if (error) {
            toastTextView.setTextColor(Color.parseColor("#830300"));
        } else {
            toastTextView.setTextColor(Color.parseColor("#149414"));
        }

        toast.setGravity(Gravity.BOTTOM, 32, 32);
        toast.show();
    }
}