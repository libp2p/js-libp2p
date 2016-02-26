var SWS = require('simple-websocket')

exports = module.exports

exports.dial = function (multiaddr, options) {
  options.ready = options.ready || function noop () {}
  var opts = multiaddr.toOptions()
  var url = 'ws://' + opts.host + ':' + opts.port
  var socket = new SWS(url)
  socket.on('connect', options.ready)
  return socket
}

exports.createListener = SWS.createServer
