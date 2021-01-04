'use strict'

const mergeOptions = require('merge-options')

const RendezvousServer = require('libp2p-rendezvous')
const Datastore = require('libp2p-rendezvous/src/datastores/memory')
const PeerId = require('peer-id')

const Envelope = require('../../src/record/envelope')
const PeerRecord = require('../../src/record/peer-record')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const relayAddr = MULTIADDRS_WEBSOCKETS[0]
const baseOptions = require('../utils/base-options.browser')

const getSubsystemOptions = (multiaddrs) => mergeOptions(baseOptions, {
  addresses: {
    listen: [`${relayAddr}/p2p-circuit`]
  },
  rendezvous: {
    enabled: true,
    rendezvousPoints: multiaddrs
  }
})

async function createRendezvousServer ({ config = {}, started = true } = {}) {
  const datastore = new Datastore()

  const peerId = await PeerId.create()
  const rendezvous = new RendezvousServer(mergeOptions(baseOptions, {
    addresses: {
      listen: [`${relayAddr}/p2p-circuit`]
    },
    peerId,
    ...config
  }), { datastore })

  if (started) {
    await rendezvous.start()
  }

  return rendezvous
}

async function createSignedPeerRecord (peerId, multiaddrs) {
  const pr = new PeerRecord({
    peerId,
    multiaddrs
  })

  const envelope = await Envelope.seal(pr, peerId)

  return envelope
}

module.exports = {
  createRendezvousServer,
  getSubsystemOptions,
  createSignedPeerRecord
}
