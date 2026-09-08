package com.faiora.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // (2026-07-13) Set transparent status bar & edge-to-edge layout. Prev: default
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().getDecorView().setBackgroundColor(Color.parseColor("#0c0502"));

        // (2026-07-13) Remove boot overlay for auto-launch. Prev: boot overlay shown
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#0c0502"));
            getBridge().getWebView().addJavascriptInterface(new NativeAlarmBridge(this), "FaioraNativeAlarmBridge");
        }
    }
}
