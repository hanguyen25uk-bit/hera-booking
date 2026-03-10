import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.herabooking.app',
  appName: 'Hera Booking',
  webDir: 'out',

  // Load from remote server (required for dynamic routes)
  server: {
    url: 'https://herabooking.com/login',
    cleartext: false,
  },

  // iOS configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#fafaf8',
  },

  // Plugin configuration
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#1a1a2e',
      showSpinner: false,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#fafaf8',
    },
  },
};

export default config;
