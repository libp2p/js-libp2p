var tcp = require('net')

exports = module.exports

exports.dial = function (multiaddr, options) {
  options.ready = options.ready || function noop () {}
  return tcp.connect(multiaddr.toOptions(), options.ready)
}

exports.createListener = tcp.createServer
