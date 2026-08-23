package com.faiora.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

final class AlarmAlertPlayer {
    private final Context context;
    private MediaPlayer mediaPlayer;
    private Vibrator vibrator;
    private AudioManager audioManager;
    private Integer previousAlarmVolume;
    private Integer previousRingerMode;

    AlarmAlertPlayer(Context context) {
        this.context = context.getApplicationContext();
    }

    void start() {
        boostAlarmVolume();
        startVibration();
        startSound();
    }

    void stop() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
            } catch (IllegalStateException ignored) {
            }
            mediaPlayer.release();
            mediaPlayer = null;
        }
        if (vibrator != null) {
            vibrator.cancel();
        }
        restoreAlarmVolume();
    }

    private void startSound() {
        try {
            audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                try {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                } catch (Exception ignored) {
                }
            }
            mediaPlayer = MediaPlayer.create(context, R.raw.alarm_ringtone_mp3);
            if (mediaPlayer == null) return;
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );
            mediaPlayer.setLooping(true);
            mediaPlayer.setVolume(1f, 1f);
            mediaPlayer.start();
        } catch (Exception ignored) {
        }
    }

    private void startVibration() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager = context.getSystemService(VibratorManager.class);
            vibrator = vibratorManager != null ? vibratorManager.getDefaultVibrator() : null;
        } else {
            vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        }
        if (vibrator == null || !vibrator.hasVibrator()) return;

        long[] pattern = new long[]{0, 500, 180, 500, 180, 800};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            vibrator.vibrate(pattern, 0);
        }
    }

    private void boostAlarmVolume() {
        try {
            audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager == null) return;
            previousRingerMode = audioManager.getRingerMode();
            if (previousRingerMode != null && previousRingerMode != AudioManager.RINGER_MODE_NORMAL) {
                audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
            }
            previousAlarmVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
            int maxAlarmVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
            if (maxAlarmVolume > 0 && previousAlarmVolume != null && previousAlarmVolume < maxAlarmVolume) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, maxAlarmVolume, AudioManager.FLAG_SHOW_UI);
            }
        } catch (Exception ignored) {
        }
    }

    private void restoreAlarmVolume() {
        try {
            if (audioManager != null && previousAlarmVolume != null) {
                audioManager.setStreamVolume(AudioManager.STREAM_ALARM, previousAlarmVolume, 0);
            }
            if (audioManager != null && previousRingerMode != null) {
                audioManager.setRingerMode(previousRingerMode);
            }
            if (audioManager != null) {
                try {
                    audioManager.abandonAudioFocus(null);
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
        } finally {
            previousAlarmVolume = null;
            previousRingerMode = null;
        }
    }
}
