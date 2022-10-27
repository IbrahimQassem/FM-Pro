package com.sana.dev.fm.model.interfaces;

import android.view.View;

public interface OnClickListener<T> {
    void onItemClick(View view, T model, int position);
}