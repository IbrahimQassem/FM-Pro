package com.sana.dev.fm.model.interfaces;

import android.view.View;

public interface OnMoreClickListener<T> {
    void onShareClick(View view, T obj, int position);
}