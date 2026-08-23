package com.faiora.app;

import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        final Handler handler = new Handler(Looper.getMainLooper());
        final View bootOverlay = buildBootOverlay();

        ViewGroup decor = findViewById(android.R.id.content);
        if (decor != null) {
            decor.addView(bootOverlay);
        }

        final Runnable hideBootOverlay = () -> {
            if (bootOverlay.getParent() == null || bootOverlay.getVisibility() != View.VISIBLE) {
                return;
            }
            bootOverlay.animate()
                .alpha(0f)
                .setDuration(180)
                .withEndAction(() -> {
                    ViewGroup parent = (ViewGroup) bootOverlay.getParent();
                    if (parent != null) {
                        parent.removeView(bootOverlay);
                    }
                })
                .start();
        };

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
            getBridge().getWebView().addJavascriptInterface(new NativeAlarmBridge(this), "FaioraNativeAlarmBridge");
        }

        handler.postDelayed(hideBootOverlay, 900);
    }

    private View buildBootOverlay() {
        FrameLayout overlay = new FrameLayout(this);
        overlay.setLayoutParams(new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ));
        overlay.setBackgroundColor(Color.parseColor("#09090B"));
        overlay.setClickable(true);

        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setGravity(Gravity.CENTER_HORIZONTAL);

        FrameLayout.LayoutParams contentParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        contentParams.gravity = Gravity.CENTER;
        content.setLayoutParams(contentParams);

        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminate(true);
        LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(dp(28), dp(28));
        spinner.setLayoutParams(spinnerParams);

        TextView label = new TextView(this);
        LinearLayout.LayoutParams labelParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        labelParams.topMargin = dp(14);
        label.setLayoutParams(labelParams);
        label.setText("Loading Faiora");
        label.setAllCaps(true);
        label.setTextColor(Color.parseColor("#FFF7ED"));
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        label.setLetterSpacing(0.22f);

        content.addView(spinner);
        content.addView(label);
        overlay.addView(content);
        return overlay;
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            value,
            getResources().getDisplayMetrics()
        ));
    }
}
