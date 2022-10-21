package com.sana.dev.fm.model;


import android.view.View;

import java.io.Serializable;

public class ButtonConfig implements Serializable {
    private String name;
    private int textColor = -1;
    private View.OnClickListener onClickListener;

    public ButtonConfig(String name) {
        this.name = name;
    }

    public ButtonConfig(String name, int color) {
        this.name = name;
        this.textColor = color;
    }

    public ButtonConfig(String name, View.OnClickListener onClickListener) {
        this.name = name;
        this.onClickListener = onClickListener;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getTextColor() {
        return textColor;
    }

    public void setTextColor(int textColor) {
        this.textColor = textColor;
    }


    public View.OnClickListener getOnClickListener() {
        return onClickListener;
    }

    public void setOnClickListener(View.OnClickListener onClickListener) {
        this.onClickListener = onClickListener;
    }
}

