'use strict'

/** @type {import('aegir').Options["build"]["config"]} */
const esbuild = {
  plugins: [
    {
      name: 'node built ins',
      setup (build) {
        build.onResolve({ filter: /^stream$/ }, () => {
          return { path: require.resolve('readable-stream') }
        })
      }
    }
  ]
}

/** @type {import('aegir').PartialOptions} */
module.exports = {
  test: {
    browser: {
      config: {
        buildConfig: esbuild
      }
    }
  },
  build: {
    bundlesizeMax: '499KB',
    config: esbuild
  }
}
