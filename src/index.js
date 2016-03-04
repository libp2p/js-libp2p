// const debug = require('debug')
// const log = debug('libp2p:tcp')
const tcp = require('net')
const multiaddr = require('multiaddr')

exports = module.exports = TCP

function TCP () {
  if (!(this instanceof TCP)) {
    return new TCP()
  }

  const listeners = []

  this.dial = function (multiaddr, options) {
    if (!options) {
      options = {}
    }
    options.ready = options.ready || function noop () {}
    return tcp.connect(multiaddr.toOptions(), options.ready)
  }

  this.createListener = (multiaddrs, options, handler, callback) => {
    if (typeof options === 'function') {
      callback = handler
      handler = options
      options = {}
    }

    if (!Array.isArray(multiaddrs)) {
      multiaddrs = [multiaddrs]
    }

    var count = 0
    const freshMultiaddrs = []

    multiaddrs.forEach((m) => {
      const listener = tcp.createServer(handler)
      listener.listen(m.toOptions(), () => {
        // Node.js likes to convert addr to IPv6 (when 0.0.0.0 for e.g)
        const address = listener.address()
        if (m.toString().indexOf('ip4')) {
          m = m.decapsulate('tcp')
          m = m.encapsulate('/tcp/' + address.port)
          freshMultiaddrs.push(m)
        }
        if (address.family === 'IPv6') {
          freshMultiaddrs.push(multiaddr('/ip6/' + address.address + '/tcp/' + address.port))
        }

        if (++count === multiaddrs.length) {
          callback(null, freshMultiaddrs)
        }
      })
      listeners.push(listener)
    })
  }

  this.close = (callback) => {
    if (listeners.length === 0) {
      throw new Error('there are no listeners')
    }
    var count = 0
    listeners.forEach((listener) => {
      listener.close(() => {
        if (++count === listeners.length) {
          callback()
        }
      })
    })
  }
}

