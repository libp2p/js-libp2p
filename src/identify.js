/*
 * Identify is one of the protocols swarms speaks in order to broadcast and learn about the ip:port
 * pairs a specific peer is available through
 */

var swarm = require('./../swarm')
var Interactive = require('multistream-select').Interactive

exports = module.exports

// peer acting as server, asking whom is talking
exports.inquiry = function (spdyConnection, cb) {
  spdyConnection.request({method: 'GET', path: '/', headers: {}}, function (stream) {
    var msi = new Interactive()
    msi.handle(stream)
    msi.select('/ipfs/identify/1.0.0', function (ds) {
      var peerId = ''
      ds.setEncoding('utf8')

      ds.on('data', function (chunk) {
        peerId += chunk
      })
      ds.on('end', function () {
        cb(null, spdyConnection, peerId)
      })
    })
  })
  // 0. open a stream
  // 1. negotiate /ipfs/identify/1.0.0
  // 2. check other peerId
  // 3. reply back with cb(null, connection, peerId)
}

// peer asking which pairs ip:port does the other peer see
exports.whoAmI = function () {

}

exports.start = function (peerSelf) {
  swarm.registerHandle('/ipfs/identify/1.0.0', function (ds) {
    ds.setDefaultEncoding('utf8')
    ds.write(peerSelf.toB58String())
    ds.end()
  })
}
