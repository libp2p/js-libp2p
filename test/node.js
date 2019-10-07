'use strict'

const glob = require('glob')
const path = require('path')

// Automatically require test files so we don't have to worry about adding new ones
glob('test/**/*.node.js', function (err, testPaths) {
  if (err) throw err
  if (testPaths.length < 1) throw new Error('Could not find any node test files')

  testPaths.forEach(file => {
    require(path.resolve(file))
  })
})
