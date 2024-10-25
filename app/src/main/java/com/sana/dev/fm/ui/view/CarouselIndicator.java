package com.sana.dev.fm.ui.view;

import android.content.Context;
import android.util.AttributeSet;
import android.view.View;
import android.widget.LinearLayout;

import androidx.core.content.ContextCompat;

import com.sana.dev.fm.R;

public class CarouselIndicator extends LinearLayout {
    private int indicatorCount;
    private int selectedPosition;
    private final int dotSize;
    private final int spacing;

    public CarouselIndicator(Context context) {
        this(context, null);
    }

    public CarouselIndicator(Context context, AttributeSet attrs) {
        super(context, attrs);
        setOrientation(HORIZONTAL);

        dotSize = dpToPx(8);
        spacing = dpToPx(8);
    }

    public void setIndicatorCount(int count) {
        removeAllViews();
        indicatorCount = count;
        for (int i = 0; i < count; i++) {
            addDot();
        }
        setSelectedPosition(0);
    }

    public void setSelectedPosition(int position) {
        selectedPosition = position;
        for (int i = 0; i < getChildCount(); i++) {
            View dot = getChildAt(i);
            dot.setSelected(i == position);
        }
    }

    private void addDot() {
        View dot = new View(getContext());
        dot.setBackground(ContextCompat.getDrawable(getContext(), R.drawable.ic_more_dot));

        MarginLayoutParams params = new MarginLayoutParams(dotSize, dotSize);
        params.setMargins(spacing / 2, 0, spacing / 2, 0);
        addView(dot, params);
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}