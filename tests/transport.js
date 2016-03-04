var tape = require('tape')
var tests = require('interface-transport/tests')
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
