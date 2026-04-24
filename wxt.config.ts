import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'PDKS Time Calculator',
    version: '1.2.2',
    description: 'Shows working hours summary on PDKS Giriş Çıkış Bilgileri panel',
    permissions: ['activeTab', 'scripting'],
    host_permissions: ['https://raw.githubusercontent.com/*'],
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
  },
});
