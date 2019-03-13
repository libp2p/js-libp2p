/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const map = require('async/map')
const range = require('lodash.range')
const random = require('lodash.random')
const Record = require('libp2p-record').Record
const fs = require('fs')
const path = require('path')

const Message = require('../src/message')

describe('Message', () => {
  it('create', () => {
    const k = Buffer.from('hello')
    const msg = new Message(Message.TYPES.PING, k, 5)

    expect(msg).to.have.property('type', 5)
    expect(msg).to.have.property('key').eql(Buffer.from('hello'))
    // TODO: confirm this works as expected
    expect(msg).to.have.property('_clusterLevelRaw', 5)
    expect(msg).to.have.property('clusterLevel', 4)
  })

  it('serialize & deserialize', function (done) {
    this.timeout(10 * 1000)
    map(range(5), (n, cb) => PeerId.create({ bits: 1024 }, cb), (err, peers) => {
      expect(err).to.not.exist()

      const closer = peers.slice(0, 5).map((p) => {
        const info = new PeerInfo(p)
        const addr = `/ip4/198.176.1.${random(198)}/tcp/1234`
        info.multiaddrs.add(addr)
        info.multiaddrs.add(`/ip4/100.176.1.${random(198)}`)
        info.connect(addr)

        return info
      })

      const provider = peers.slice(0, 5).map((p) => {
        const info = new PeerInfo(p)
        info.multiaddrs.add(`/ip4/98.176.1.${random(198)}/tcp/1234`)
        info.multiaddrs.add(`/ip4/10.176.1.${random(198)}`)

        return info
      })

      const msg = new Message(Message.TYPES.GET_VALUE, Buffer.from('hello'), 5)
      const record = new Record(Buffer.from('hello'), Buffer.from('world'))

      msg.closerPeers = closer
      msg.providerPeers = provider
      msg.record = record

      const enc = msg.serialize()
      const dec = Message.deserialize(enc)

      expect(dec.type).to.be.eql(msg.type)
      expect(dec.key).to.be.eql(msg.key)
      expect(dec.clusterLevel).to.be.eql(msg.clusterLevel)
      expect(dec.record.serialize()).to.be.eql(record.serialize())
      expect(dec.record.key).to.eql(Buffer.from('hello'))

      expect(dec.closerPeers).to.have.length(5)
      dec.closerPeers.forEach((peer, i) => {
        expect(peer.id.isEqual(msg.closerPeers[i].id)).to.eql(true)
        expect(peer.multiaddrs.toArray())
          .to.eql(msg.closerPeers[i].multiaddrs.toArray())
      })

      expect(dec.providerPeers).to.have.length(5)
      dec.providerPeers.forEach((peer, i) => {
        expect(peer.id.isEqual(msg.providerPeers[i].id)).to.equal(true)
        expect(peer.multiaddrs.toArray())
          .to.eql(msg.providerPeers[i].multiaddrs.toArray())
      })

      done()
    })
  })

  it('clusterlevel', () => {
    const msg = new Message(Message.TYPES.PING, Buffer.from('hello'), 0)

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
        expect(Buffer.isBuffer(msg.record.key)).to.eql(true)
      }

      if (msg.providerPeers.length > 0) {
        msg.providerPeers.forEach((p) => {
          expect(PeerInfo.isPeerInfo(p)).to.eql(true)
        })
      }
    })
  })
})
