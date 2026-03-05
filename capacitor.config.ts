import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.herabooking.app',
  appName: 'Hera Booking',
  webDir: 'out',

  // Point to hosted Vercel site (no static export needed)
  server: {
    url: 'https://herabooking.com',
    cleartext: false,
  },

  // iOS configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#1a1a1a',
  },

  // Plugin configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1a1a1a',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1a1a1a',
    },
  },
};

export default config;
