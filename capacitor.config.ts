import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faiora.app',
  appName: 'Faiora',
  webDir: 'www', // Source of truth for web assets. Use 'npm run sync-android' to sync from root. (Fixed outdated APK issue 2026-04-16)
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com']
    }
  }
};

export default config;