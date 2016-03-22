module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['mocha'],

    files: [
      'tests/multiplex-test.js',
      'tests/browser-nodejs/browser.js'
    ],

    preprocessors: {
      'tests/*': ['webpack'],
      'tests/browser-nodejs/*': ['webpack']
    },

    webpack: {
      resolve: {
        extensions: ['', '.js']
      },
      node: {
        Buffer: true
      }
    },

    webpackMiddleware: {
      noInfo: true,
      stats: {
        colors: true
      }
    },
    reporters: ['spec'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    browsers: process.env.TRAVIS ? ['Firefox'] : ['Chrome'],
    captureTimeout: 60000,
    singleRun: true
  })
}
