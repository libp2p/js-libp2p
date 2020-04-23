'use strict'

const PeerId = require('peer-id')
const DuplexPair = require('it-pair/duplex')

const { expect } = require('chai')

exports.first = (map) => map.values().next().value

exports.expectSet = (set, subs) => {
  expect(Array.from(set.values())).to.eql(subs)
}

exports.createPeerId = async () => {
  const peerId = await PeerId.create({ bits: 1024 })

  return peerId
}

exports.mockRegistrar = {
  handle: () => {},
  register: () => {},
  unregister: () => {}
}

exports.createMockRegistrar = (registrarRecord) => ({
  handle: (multicodecs, handler) => {
    const rec = registrarRecord[multicodecs[0]] || {}

    registrarRecord[multicodecs[0]] = {
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
})

exports.ConnectionPair = () => {
  const [d0, d1] = DuplexPair()

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

exports.defOptions = {
  emitSelf: true
}
