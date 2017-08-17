'use strict'

// Based on npmjs.com/nodeify but without additional `nextTick` calls
// to keep the overhead low
module.exports = function nodeify (promise, cb) {
  return promise.then((res) => {
    cb(null, res)
  }, (err) => {
    cb(err)
  })
}
