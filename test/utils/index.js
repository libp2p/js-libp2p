'use strict'

const duplexPair = require('it-pair/duplex')

const createMockRegistrar = (registrarRecord) => {
  const mockRegistrar = {
    handle: (multicodec, handler) => {
      const rec = registrarRecord[multicodec] || {}

      registrarRecord[multicodec] = {
        ...rec,
        handler
      }
    },
    unhandle: (multicodec) => {
      delete registrarRecord[multicodec]
    },
    register: ({ multicodecs, _onConnect, _onDisconnect }) => {
      const rec = registrarRecord[multicodecs[0]] || {}

      registrarRecord[multicodecs[0]] = {
        ...rec,
        onConnect: _onConnect,
        onDisconnect: _onDisconnect
      }

      return multicodecs[0]
    },
    unregister: (id) => {
      delete registrarRecord[id]
    }
  }
  mockRegistrar.connectionManager = {
    get: () => {}
  }
  return mockRegistrar
}

exports.createMockRegistrar = createMockRegistrar

const ConnectionPair = () => {
  const [d0, d1] = duplexPair()

  return [
    {
      stream: d0,
      newStream: () => Promise.resolve({ stream: d0 })
    },
    {
      stream: d1,
      newStream: () => Promise.resolve({ stream: d1 })
    }
  ]
}

exports.ConnectionPair = ConnectionPair

// Count how many peers are in b but are not in a
exports.countDiffPeers = (a, b) => {
  const s = new Set()
  a.forEach((p) => s.add(p.toB58String()))

  return b.filter((p) => !s.has(p.toB58String())).length
}
