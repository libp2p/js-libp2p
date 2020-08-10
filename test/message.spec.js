/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerId = require('peer-id')
const multiaddr = require('multiaddr')
const range = require('lodash.range')
const random = require('lodash.random')
const { Record } = require('libp2p-record')
const fs = require('fs')
const path = require('path')
const Message = require('../src/message')
const uint8ArrayFromString = require('uint8arrays/from-string')

describe('Message', () => {
  it('create', () => {
    const k = uint8ArrayFromString('hello')
    const msg = new Message(Message.TYPES.PING, k, 5)

    expect(msg).to.have.property('type', 5)
    expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
    // TODO: confirm this works as expected
    expect(msg).to.have.property('_clusterLevelRaw', 5)
    expect(msg).to.have.property('clusterLevel', 4)
  })

  it('serialize & deserialize', async function () {
    this.timeout(10 * 1000)

    const peers = await Promise.all(
      Array.from({ length: 5 }).map(() => PeerId.create({ bits: 1024 })))

    const closer = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        multiaddr(`/ip4/198.176.1.${random(198)}/tcp/1234`),
        multiaddr(`/ip4/100.176.1.${random(198)}`)
      ]
    }))

    const provider = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        multiaddr(`/ip4/98.176.1.${random(198)}/tcp/1234`),
        multiaddr(`/ip4/10.176.1.${random(198)}`)
      ]
    }))

    const msg = new Message(Message.TYPES.GET_VALUE, uint8ArrayFromString('hello'), 5)
    const record = new Record(uint8ArrayFromString('hello'), uint8ArrayFromString('world'))

    msg.closerPeers = closer
    msg.providerPeers = provider
    msg.record = record

    const enc = msg.serialize()
    const dec = Message.deserialize(enc)

    expect(dec.type).to.be.eql(msg.type)
    expect(dec.key).to.be.eql(msg.key)
    expect(dec.clusterLevel).to.be.eql(msg.clusterLevel)
    expect(dec.record.serialize()).to.be.eql(record.serialize())
    expect(dec.record.key).to.eql(uint8ArrayFromString('hello'))

    expect(dec.closerPeers).to.have.length(5)
    dec.closerPeers.forEach((peer, i) => {
      expect(peer.id.isEqual(msg.closerPeers[i].id)).to.eql(true)
      expect(peer.multiaddrs).to.eql(msg.closerPeers[i].multiaddrs)
    })

    expect(dec.providerPeers).to.have.length(5)
    dec.providerPeers.forEach((peer, i) => {
      expect(peer.id.isEqual(msg.providerPeers[i].id)).to.equal(true)
      expect(peer.multiaddrs).to.eql(msg.providerPeers[i].multiaddrs)
    })
  })

  it('clusterlevel', () => {
    const msg = new Message(Message.TYPES.PING, uint8ArrayFromString('hello'), 0)

    msg.clusterLevel = 10
    expect(msg.clusterLevel).to.eql(9)
  })

  it('go-interop', () => {
    range(1, 9).forEach((i) => {
      const raw = fs.readFileSync(
        path.join(__dirname, 'fixtures', `msg-${i}`)
      )

      const msg = Message.deserialize(raw)

      expect(msg.clusterLevel).to.gte(0)
      if (msg.record) {
        expect(msg.record.key).to.be.a('Uint8Array')
      }

      if (msg.providerPeers.length > 0) {
        msg.providerPeers.forEach((p) => {
          expect(PeerId.isPeerId(p.id)).to.eql(true)
        })
      }
    })
  })
})
