import { defineConfig } from '#q-app/wrappers'

export default defineConfig((/* ctx */) => {
  return {
    boot: ['quasar-defaults'],

    css: ['app.scss'],

    extras: ['material-icons', 'material-icons-outlined'],

    build: {
      target: {
        browser: ['es2022', 'firefox115', 'chrome115', 'safari14'],
        node: 'node20',
      },
      vueRouterMode: 'history',
      typescript: {
        strict: true,
        vueShim: true,
      },
    },

    devServer: {
      open: false,
      port: 9000,
      proxy: {
        '/api': {
          target: 'http://localhost:5165',
          changeOrigin: true,
          secure: false,
        },
        '/hubs': {
          target: 'http://localhost:5165',
          changeOrigin: true,
          secure: false,
          ws: true,
        },
      },
    },

    framework: {
      config: {
        dark: false,
        ripple: false,
        notify: {
          position: 'bottom-right',
          timeout: 3500,
          textColor: 'white',
        },
      },
      iconSet: 'material-icons',
      components: [],
      directives: ['ClosePopup'],
      plugins: ['Notify', 'Dialog', 'Dark'],
    },

    animations: [],
  }
})
