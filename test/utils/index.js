'use strict'

const delay = require('delay')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
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

exports.bootstrap = (dhts) => {
  dhts.forEach((dht) => {
    dht.randomWalk._walk(1, 10000)
  })
}

exports.waitForWellFormedTables = (dhts, minPeers, avgPeers, waitTimeout) => {
  return pTimeout(pRetry(async () => {
    let totalPeers = 0

    const ready = dhts.map((dht) => {
      const rtlen = dht.routingTable.size
      totalPeers += rtlen
      if (minPeers > 0 && rtlen < minPeers) {
        return false
      }
      const actualAvgPeers = totalPeers / dhts.length
      if (avgPeers > 0 && actualAvgPeers < avgPeers) {
        return false
      }
      return true
    })

    if (ready.every(Boolean)) {
      return
    }
    await delay(200)
    throw new Error('not done yet')
  }, {
    retries: 50
  }), waitTimeout)
}

// Count how many peers are in b but are not in a
exports.countDiffPeers = (a, b) => {
  const s = new Set()
  a.forEach((p) => s.add(p.toB58String()))

  return b.filter((p) => !s.has(p.toB58String())).length
}
