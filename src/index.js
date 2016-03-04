const debug = require('debug')
const log = debug('libp2p:tcp')
const tcp = require('net')

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

    multiaddrs.forEach((m) => {
      const listener = tcp.createServer(handler)
      listener.listen(m.toOptions(), () => {
        log('listening on: ', m.toString())
        if (++count === multiaddrs.length) {
          callback()
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

