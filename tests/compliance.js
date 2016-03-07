var tape = require('tape')
var tests = require('interface-stream-muxer')
var multiplex = require('./../src')

var common = {
  setup: function (t, cb) {
    cb(null, multiplex)
  },
  teardown: function (t, cb) {
    cb()
  }
}

tests(tape, common)
