import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faiora.app',
  appName: 'Faiora',
  webDir: 'www', // Source of truth for web assets. Use 'npm run sync-android' to sync from root. (Fixed outdated APK issue 2026-04-16)
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com']
    },
    // (2026-07-13) Set smallIcon to ic_stat_faiora for notifications. Prev: none
    LocalNotifications: {
      smallIcon: 'ic_stat_faiora',
      iconColor: '#f97316',
      sound: 'fire_transition_sfx.mp3'
    }
  }
};

export default config;
