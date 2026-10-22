import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.custo3d.app',
  appName: 'Printaê',
  webDir: 'dist',
  android: {
    // permite assets locais sem servidor remoto
    allowMixedContent: false,
  },
};

export default config;
