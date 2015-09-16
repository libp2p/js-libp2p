var tape = require('tape')
var tests = require('abstract-connection/tests')
var conn = require('../src')

var common = {
  setup: function (t, cb) {
    cb(null, conn)
  },
  teardown: function (t, cb) {
    cb()
  }
}

tests(tape, common)
