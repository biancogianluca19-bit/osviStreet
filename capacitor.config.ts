import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.osvistreet.arcade',
  appName: 'osviStreet',
  webDir: 'dist',
  backgroundColor: '#171725',
  plugins: {
    ScreenOrientation: { orientation: 'landscape' },
  },
};

export default config;
