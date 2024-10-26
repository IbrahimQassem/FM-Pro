package com.sana.dev.fm.model.interfaces;

import android.view.View;

public interface OnCheckedChangeListener<T> {
    void onCheckedChanged(View view, T obj,  boolean isChecked,int position);
}