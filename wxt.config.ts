import { defineConfig } from 'wxt';
import { version } from './package.json';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  modules: ['@wxt-dev/module-react'],
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.command === 'serve') return;
      // The parser is injected only after an activeTab gesture; it does not need
      // WXT's automatic all-sites grant for runtime content-script registration.
      manifest.host_permissions = manifest.host_permissions?.filter((host: string) => host !== '<all_urls>');
      manifest.permissions = manifest.permissions?.filter(permission => permission !== '<all_urls>');
    },
  },
  manifest: ({ browser }) => ({
    name: 'PDKS Time Calculator',
    version,
    description: 'Shows working hours summary on PDKS Giriş Çıkış Bilgileri panel',
    permissions: ['activeTab', 'scripting', 'storage', 'alarms'],
    optional_permissions: ['notifications'],
    host_permissions: ['https://raw.githubusercontent.com/*'],
    ...(browser === 'firefox' && {
      browser_specific_settings: {
        gecko: {
          id: 'pdks-time-calculator@okumusmr',
          strict_min_version: '142.0',
          data_collection_permissions: {
            required: ['none'],
            optional: [],
          },
        },
      },
    }),
    icons: {
      16: 'icons/icon16.png',
      32: 'icons/icon32.png',
      48: 'icons/icon48.png',
      128: 'icons/icon128.png',
    },
    action: {
      default_title: 'PDKS Time Calculator',
      default_icon: {
        16: 'icons/icon16.png',
        32: 'icons/icon32.png',
        48: 'icons/icon48.png',
        128: 'icons/icon128.png',
      },
    },
  }),
});
