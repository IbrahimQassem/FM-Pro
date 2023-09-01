package com.sana.dev.fm.model.interfaces;

import android.view.View;

public interface OnItemLongClick<T> {
    void onItemLongClick(View view, T model, int position);
}