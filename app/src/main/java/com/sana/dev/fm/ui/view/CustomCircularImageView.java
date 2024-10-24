package com.sana.dev.fm.ui.view;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.BitmapDrawable;
import android.graphics.drawable.Drawable;
import android.util.AttributeSet;

import androidx.appcompat.widget.AppCompatImageView;

public class CustomCircularImageView extends AppCompatImageView {
    private float borderWidth = 0f;
    private int borderColor = Color.WHITE;
    private float shadowRadius = 0f;
    private int shadowColor = Color.BLACK;
    private boolean isShadowEnabled = false;

    private Paint paintBorder;
    private Paint paintImage;
    private Paint paintBackground;
    private Path path;

    public CustomCircularImageView(Context context) {
        super(context);
        init();
    }

    public CustomCircularImageView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public CustomCircularImageView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        paintBorder = new Paint(Paint.ANTI_ALIAS_FLAG);
        paintBorder.setStyle(Paint.Style.STROKE);
        paintBorder.setColor(borderColor);
        paintBorder.setStrokeWidth(borderWidth);

        paintImage = new Paint(Paint.ANTI_ALIAS_FLAG);

        paintBackground = new Paint(Paint.ANTI_ALIAS_FLAG);
        paintBackground.setStyle(Paint.Style.FILL);
        paintBackground.setColor(Color.WHITE);

        path = new Path();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        Drawable drawable = getDrawable();
        if (drawable == null) {
            return;
        }

        Bitmap bitmap = getBitmapFromDrawable(drawable);
        if (bitmap == null) {
            return;
        }

        float centerX = getWidth() / 2f;
        float centerY = getHeight() / 2f;
        float radius = (Math.min(getWidth(), getHeight()) / 2f) - borderWidth -
                (isShadowEnabled ? shadowRadius : 0f);

        // Draw shadow if enabled
        if (isShadowEnabled) {
            paintBackground.setShadowLayer(shadowRadius, 0f, 0f, shadowColor);
            canvas.drawCircle(centerX, centerY, radius, paintBackground);
        }

        // Create circular path
        path.reset();
        path.addCircle(centerX, centerY, radius, Path.Direction.CW);

        // Draw the circular image
        canvas.clipPath(path);
        canvas.drawBitmap(
                bitmap,
                null,
                new RectF(
                        centerX - radius,
                        centerY - radius,
                        centerX + radius,
                        centerY + radius
                ),
                paintImage
        );

        // Draw border
        if (borderWidth > 0) {
            canvas.drawCircle(centerX, centerY, radius, paintBorder);
        }
    }

    private Bitmap getBitmapFromDrawable(Drawable drawable) {
        if (drawable instanceof BitmapDrawable) {
            return ((BitmapDrawable) drawable).getBitmap();
        }

        Bitmap bitmap = Bitmap.createBitmap(
                drawable.getIntrinsicWidth(),
                drawable.getIntrinsicHeight(),
                Bitmap.Config.ARGB_8888
        );
        Canvas canvas = new Canvas(bitmap);
        drawable.setBounds(0, 0, canvas.getWidth(), canvas.getHeight());
        drawable.draw(canvas);
        return bitmap;
    }

    @Override
    protected void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
        int width = MeasureSpec.getSize(widthMeasureSpec);
        int height = MeasureSpec.getSize(heightMeasureSpec);
        int size = Math.min(width, height);
        setMeasuredDimension(size, size);
    }

    // Public methods for customization
    public void setBorderWidth(float width) {
        this.borderWidth = width;
        paintBorder.setStrokeWidth(width);
        invalidate();
    }

    public void setBorderColor(int color) {
        this.borderColor = color;
        paintBorder.setColor(color);
        invalidate();
    }

    public void setShadowRadius(float radius) {
        this.shadowRadius = radius;
        invalidate();
    }

    public void setShadowColor(int color) {
        this.shadowColor = color;
        invalidate();
    }

    public void setShadowEnabled(boolean enabled) {
        this.isShadowEnabled = enabled;
        invalidate();
    }

    // Getter methods
    public float getBorderWidth() {
        return borderWidth;
    }

    public int getBorderColor() {
        return borderColor;
    }

    public float getShadowRadius() {
        return shadowRadius;
    }

    public int getShadowColor() {
        return shadowColor;
    }

    public boolean isShadowEnabled() {
        return isShadowEnabled;
    }
}