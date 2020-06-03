'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai

const multiaddr = require('multiaddr')

const tests = require('libp2p-interfaces/src/record/tests')
const PeerRecord = require('../../src/record-manager/peer-record')

const peerUtils = require('../utils/creators/peer')

describe('interface-record compliance', () => {
  tests({
    async setup () {
      const [peerId] = await peerUtils.createPeerId()
      return new PeerRecord({ peerId })
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})

describe('PeerRecord', () => {
  let peerId

  before(async () => {
    [peerId] = await peerUtils.createPeerId()
  })

  it('creates a peer record with peerId', () => {
    const peerRecord = new PeerRecord({ peerId })

    expect(peerRecord).to.exist()
    expect(peerRecord.peerId).to.exist()
    expect(peerRecord.multiaddrs).to.exist()
    expect(peerRecord.multiaddrs).to.have.lengthOf(0)
    expect(peerRecord.seqNumber).to.exist()
  })

  it('creates a peer record with provided data', () => {
    const multiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/2000')
    ]
    const seqNumber = Date.now()
    const peerRecord = new PeerRecord({ peerId, multiaddrs, seqNumber })

    expect(peerRecord).to.exist()
    expect(peerRecord.peerId).to.exist()
    expect(peerRecord.multiaddrs).to.exist()
    expect(peerRecord.multiaddrs).to.eql(multiaddrs)
    expect(peerRecord.seqNumber).to.exist()
    expect(peerRecord.seqNumber).to.eql(seqNumber)
  })

  it('marshals and unmarshals a peer record', () => {
    const multiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/2000')
    ]
    const seqNumber = Date.now()
    const peerRecord = new PeerRecord({ peerId, multiaddrs, seqNumber })

    // Marshal
    const rawData = peerRecord.marshal()
    expect(rawData).to.exist()

    // Unmarshal
    const unmarshalPeerRecord = PeerRecord.createFromProtobuf(rawData)
    expect(unmarshalPeerRecord).to.exist()

    const isEqual = peerRecord.isEqual(unmarshalPeerRecord)
    expect(isEqual).to.eql(true)
  })

  it('isEqual returns false if the peer record has a different peerId', async () => {
    const peerRecord0 = new PeerRecord({ peerId })

    const [peerId1] = await peerUtils.createPeerId({ fixture: false })
    const peerRecord1 = new PeerRecord({ peerId: peerId1 })

    const isEqual = peerRecord0.isEqual(peerRecord1)
    expect(isEqual).to.eql(false)
  })

  it('isEqual returns false if the peer record has a different seqNumber', () => {
    const ts0 = Date.now()
    const peerRecord0 = new PeerRecord({ peerId, seqNumber: ts0 })

    const ts1 = ts0 + 20
    const peerRecord1 = new PeerRecord({ peerId, seqNumber: ts1 })

    const isEqual = peerRecord0.isEqual(peerRecord1)
    expect(isEqual).to.eql(false)
  })

  it('isEqual returns false if the peer record has a different multiaddrs', () => {
    const multiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/2000')
    ]
    const peerRecord0 = new PeerRecord({ peerId, multiaddrs })

    const multiaddrs1 = [
      multiaddr('/ip4/127.0.0.1/tcp/2001')
    ]
    const peerRecord1 = new PeerRecord({ peerId, multiaddrs: multiaddrs1 })

    const isEqual = peerRecord0.isEqual(peerRecord1)
    expect(isEqual).to.eql(false)
  })
})

describe('PeerRecord inside Envelope', () => {
  // TODO
})
