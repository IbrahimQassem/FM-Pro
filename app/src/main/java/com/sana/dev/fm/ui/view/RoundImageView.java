package com.sana.dev.fm.ui.view;

import android.content.Context;
import android.content.res.TypedArray;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.util.AttributeSet;

import androidx.appcompat.widget.AppCompatImageView;

import com.sana.dev.fm.R;

public class RoundImageView extends AppCompatImageView {

    private float radius = 0.0f;
    private boolean isCircle = false;
    private float borderWidth = 0.0f;
    private int borderColor = Color.WHITE;
    private Path path;
    private RectF rect;
    private Paint borderPaint;

    public RoundImageView(Context context) {
        super(context);
        init();
    }

    public RoundImageView(Context context, AttributeSet attrs) {
        super(context, attrs);
        initAttributes(context, attrs);
        init();
    }

    public RoundImageView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        initAttributes(context, attrs);
        init();
    }

    private void initAttributes(Context context, AttributeSet attrs) {
        TypedArray a = context.obtainStyledAttributes(attrs, R.styleable.RoundImageView);
        radius = a.getDimension(R.styleable.RoundImageView_cornerRadius, 0);
        borderWidth = a.getDimension(R.styleable.RoundImageView_borderWidth, 0);
        borderColor = a.getColor(R.styleable.RoundImageView_borderColor, Color.WHITE);
        a.recycle();
    }

    private void init() {
        path = new Path();
        rect = new RectF();
        borderPaint = new Paint();
        borderPaint.setAntiAlias(true);
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setColor(borderColor);
        borderPaint.setStrokeWidth(borderWidth);
    }

//    @Override
//    protected void onDraw(Canvas canvas) {
//        rect.set(0, 0, getWidth(), getHeight());
//        path.reset();
//        path.addRoundRect(rect, radius, radius, Path.Direction.CW);
//        canvas.clipPath(path);
//        super.onDraw(canvas);
//    }

    @Override
    protected void onDraw(Canvas canvas) {
        float radius = this.radius;
        float halfBorderWidth = borderWidth / 2;

        // Adjust rect for border width
        rect.set(halfBorderWidth,
                halfBorderWidth,
                getWidth() - halfBorderWidth,
                getHeight() - halfBorderWidth);

        path.reset();

        if (isCircle) {
            float circleRadius = Math.min(rect.width(), rect.height()) / 2;
            canvas.clipPath(path);
            path.addCircle(rect.centerX(),
                    rect.centerY(),
                    circleRadius,
                    Path.Direction.CW);
        } else {
            path.addRoundRect(rect,
                    radius,
                    radius,
                    Path.Direction.CW);
        }

        canvas.clipPath(path);
        super.onDraw(canvas);

        // Draw border if borderWidth > 0
        if (borderWidth > 0) {
            if (isCircle) {
                float circleRadius = Math.min(getWidth(), getHeight()) / 2 - halfBorderWidth;
                canvas.drawCircle(getWidth() / 2,
                        getHeight() / 2,
                        circleRadius,
                        borderPaint);
            } else {
                canvas.drawRoundRect(rect,
                        radius,
                        radius,
                        borderPaint);
            }
        }
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        if (isCircle) {
            int size = Math.min(getMeasuredWidth(), getMeasuredHeight());
            setMeasuredDimension(size, size);
        }
    }

    // Setters
    public void setCornerRadius(float radius) {
        this.radius = radius;
        invalidate();
    }

    public void setCircle(boolean circle) {
        this.isCircle = circle;
        requestLayout();
        invalidate();
    }

    public void setBorderWidth(float width) {
        this.borderWidth = width;
        borderPaint.setStrokeWidth(width);
        invalidate();
    }

    public void setBorderColor(int color) {
        this.borderColor = color;
        borderPaint.setColor(color);
        invalidate();
    }

    // Getters
    public float getCornerRadius() {
        return radius;
    }

    public boolean isCircle() {
        return isCircle;
    }

    public float getBorderWidth() {
        return borderWidth;
    }

    public int getBorderColor() {
        return borderColor;
    }
}