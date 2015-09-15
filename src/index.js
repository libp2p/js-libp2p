var tcp = require('net')
var async = require('async')

exports = module.exports

exports.dial = function (peerInfo, callback) {
  var socket
  async.eachSeries(peerInfo.multiaddrs, function (multiaddr, next) {
    if (!multiaddr.protoNames().indexOf('tcp')) {
      return next()
    }

    if (socket) {
      return next()
    }

    var tmp = tcp.connect(multiaddr.toOptions(), function connected () {
      socket = tmp
      next()
    })

    tmp.once('error', function (err) {
      console.log(multiaddr.toString(), 'on',
          peerInfo.id.toB58String(), 'not available', err)
      next()
    })
  }, function done () {
    if (!socket) {
      return callback(new Error('Not able to open a scoket with peer - ',
        peerInfo.id.toB58String()))
    }
    callback(null, socket)
  })
}

exports.listen = function (options, callback, readyCallback) {
  options.port = options.port || 4001

  var listener = tcp.createServer(function (socket) {
    callback(null, socket)
  })

  listener.listen(options.port, readyCallback)

  return listener
}
