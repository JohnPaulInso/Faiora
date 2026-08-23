package com.faiora.app;

import android.animation.ValueAnimator;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.util.AttributeSet;
import android.view.MotionEvent;
import android.view.View;

import androidx.annotation.Nullable;

public class AlarmSwipeRingView extends View {
    public interface OnCompleteListener {
        void onComplete();
    }

    private final Paint trackPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint progressPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint knobPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint centerCirclePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint centerRingPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint centerTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint captionPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint arrowPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final RectF arcBounds = new RectF();

    private float progress = 0f;
    private float radius = 0f;
    private float strokeWidth = 0f;
    private boolean tracking = false;
    private OnCompleteListener onCompleteListener;
    private ValueAnimator resetAnimator;

    public AlarmSwipeRingView(Context context) {
        super(context);
        init();
    }

    public AlarmSwipeRingView(Context context, @Nullable AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    public AlarmSwipeRingView(Context context, @Nullable AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        init();
    }

    private void init() {
        strokeWidth = dp(2.2f);

        trackPaint.setStyle(Paint.Style.STROKE);
        trackPaint.setStrokeWidth(strokeWidth);
        trackPaint.setColor(0x19E8DED4);
        trackPaint.setStrokeCap(Paint.Cap.ROUND);

        progressPaint.setStyle(Paint.Style.STROKE);
        progressPaint.setStrokeWidth(dp(3.1f));
        progressPaint.setColor(0x55F97316);
        progressPaint.setStrokeCap(Paint.Cap.ROUND);

        knobPaint.setStyle(Paint.Style.FILL);
        knobPaint.setColor(0xFFE9DED0);
        knobPaint.setShadowLayer(dp(10), 0, 0, 0x33F97316);
        setLayerType(LAYER_TYPE_SOFTWARE, knobPaint);

        centerCirclePaint.setStyle(Paint.Style.FILL);
        centerCirclePaint.setColor(0xFF141414);
        centerCirclePaint.setShadowLayer(dp(12), 0, dp(3), 0x44000000);

        centerRingPaint.setStyle(Paint.Style.STROKE);
        centerRingPaint.setStrokeWidth(dp(1.8f));
        centerRingPaint.setColor(0x2FFFFFFF);

        centerTextPaint.setColor(0xFFF97316);
        centerTextPaint.setTextAlign(Paint.Align.CENTER);
        centerTextPaint.setTextSize(dp(30));

        captionPaint.setColor(0x42FFF7ED);
        captionPaint.setTextAlign(Paint.Align.CENTER);
        captionPaint.setTextSize(dp(8.2f));
        captionPaint.setFakeBoldText(true);
        captionPaint.setLetterSpacing(0.26f);

        arrowPaint.setColor(0x3EFFF7ED);
        arrowPaint.setTextAlign(Paint.Align.CENTER);
        arrowPaint.setTextSize(dp(10));
        arrowPaint.setFakeBoldText(true);
    }

    public void setOnCompleteListener(@Nullable OnCompleteListener listener) {
        this.onCompleteListener = listener;
    }

    @Override
    protected void onSizeChanged(int w, int h, int oldw, int oldh) {
        super.onSizeChanged(w, h, oldw, oldh);
        float cx = w / 2f;
        float cy = h / 2f;
        radius = Math.min(w, h) / 2f - dp(14);
        arcBounds.set(cx - radius, cy - radius, cx + radius, cy + radius);
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f;
        float centerRadius = dp(42);

        canvas.drawArc(arcBounds, -90, 360, false, trackPaint);
        if (progress > 0f) {
            canvas.drawArc(arcBounds, -90, progress * 330f, false, progressPaint);
        }

        if (progress > 0f) {
            double angle = Math.toRadians(progress * 360f - 90f);
            float knobX = cx + (float) Math.cos(angle) * radius;
            float knobY = cy + (float) Math.sin(angle) * radius;
            canvas.drawCircle(knobX, knobY, dp(5.6f), knobPaint);
        }

        canvas.drawCircle(cx, cy, centerRadius, centerCirclePaint);
        canvas.drawCircle(cx, cy, centerRadius, centerRingPaint);
        canvas.drawText("\u00D7", cx, cy + dp(10), centerTextPaint);
        canvas.drawText("\u2303", cx, cy + radius + dp(12), arrowPaint);
        canvas.drawText("SWIPE TO STOP", cx, cy + radius + dp(30), captionPaint);
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        float cx = getWidth() / 2f;
        float cy = getHeight() / 2f;
        float dx = event.getX() - cx;
        float dy = event.getY() - cy;
        float distance = (float) Math.sqrt(dx * dx + dy * dy);
        float angle = angleFromTopClockwise(dx, dy);

        switch (event.getActionMasked()) {
            case MotionEvent.ACTION_DOWN:
                cancelResetAnimation();
                if (distance < radius - strokeWidth * 2.4f || distance > radius + strokeWidth * 2.4f) {
                    return false;
                }
                if (angle > 45f && angle < 315f) {
                    return false;
                }
                tracking = true;
                progress = 0f;
                invalidate();
                return true;
            case MotionEvent.ACTION_MOVE:
                if (!tracking) return false;
                if (distance < radius - strokeWidth * 2.8f || distance > radius + strokeWidth * 2.8f) {
                    progress = Math.max(0f, progress - 0.03f);
                    invalidate();
                    return true;
                }
                if (angle > 330f) {
                    angle = 0f;
                }
                progress = Math.max(0f, Math.min(1f, angle / 330f));
                invalidate();
                return true;
            case MotionEvent.ACTION_UP:
            case MotionEvent.ACTION_CANCEL:
                if (!tracking) return false;
                tracking = false;
                if (progress >= 0.96f) {
                    progress = 1f;
                    invalidate();
                    if (onCompleteListener != null) onCompleteListener.onComplete();
                } else {
                    animateReset();
                }
                return true;
            default:
                return super.onTouchEvent(event);
        }
    }

    private void animateReset() {
        cancelResetAnimation();
        resetAnimator = ValueAnimator.ofFloat(progress, 0f);
        resetAnimator.setDuration(180);
        resetAnimator.addUpdateListener(animation -> {
            progress = (float) animation.getAnimatedValue();
            invalidate();
        });
        resetAnimator.start();
    }

    private void cancelResetAnimation() {
        if (resetAnimator != null) {
            resetAnimator.cancel();
            resetAnimator = null;
        }
    }

    private float angleFromTopClockwise(float dx, float dy) {
        double radians = Math.atan2(dy, dx) + Math.PI / 2d;
        double degrees = Math.toDegrees(radians);
        if (degrees < 0) degrees += 360d;
        return (float) degrees;
    }

    private float dp(float value) {
        return value * getResources().getDisplayMetrics().density;
    }
}
