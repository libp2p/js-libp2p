/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import { Multiaddr } from '@multiformats/multiaddr'
import range from 'lodash.range'
import random from 'lodash.random'
import { Libp2pRecord } from '@libp2p/record'
import fs from 'fs'
import path from 'path'
import { Message, MESSAGE_TYPE } from '../src/message/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { isPeerId } from '@libp2p/interfaces/peer-id'

describe('Message', () => {
  it('create', () => {
    const k = uint8ArrayFromString('hello')
    const msg = new Message(MESSAGE_TYPE.PING, k, 5)

    expect(msg).to.have.property('type', 5)
    expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
    // TODO: confirm this works as expected
    expect(msg).to.have.property('clusterLevelRaw', 5)
    expect(msg).to.have.property('clusterLevel', 4)
  })

  it('serialize & deserialize', async function () {
    this.timeout(10 * 1000)

    const peers = await Promise.all(
      Array.from({ length: 5 }).map(async () => await createEd25519PeerId()))

    const closer = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        new Multiaddr(`/ip4/198.176.1.${random(198)}/tcp/1234`),
        new Multiaddr(`/ip4/100.176.1.${random(198)}`)
      ],
      protocols: []
    }))

    const provider = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        new Multiaddr(`/ip4/98.176.1.${random(198)}/tcp/1234`),
        new Multiaddr(`/ip4/10.176.1.${random(198)}`)
      ],
      protocols: []
    }))

    const msg = new Message(MESSAGE_TYPE.GET_VALUE, uint8ArrayFromString('hello'), 5)
    const record = new Libp2pRecord(uint8ArrayFromString('hello'), uint8ArrayFromString('world'))

    msg.closerPeers = closer
    msg.providerPeers = provider
    msg.record = record

    const enc = msg.serialize()
    const dec = Message.deserialize(enc)

    expect(dec.type).to.be.eql(msg.type)
    expect(dec.key).to.be.eql(msg.key)
    expect(dec.clusterLevel).to.be.eql(msg.clusterLevel)

    if (dec.record == null) {
      throw new Error('No record found')
    }

    expect(dec.record.serialize()).to.be.eql(record.serialize())
    expect(dec.record.key).to.eql(uint8ArrayFromString('hello'))

    expect(dec.closerPeers).to.have.length(5)
    dec.closerPeers.forEach((peer, i) => {
      expect(peer.id.equals(msg.closerPeers[i].id)).to.eql(true)
      expect(peer.multiaddrs).to.eql(msg.closerPeers[i].multiaddrs)
    })

    expect(dec.providerPeers).to.have.length(5)
    dec.providerPeers.forEach((peer, i) => {
      expect(peer.id.equals(msg.providerPeers[i].id)).to.equal(true)
      expect(peer.multiaddrs).to.eql(msg.providerPeers[i].multiaddrs)
    })
  })

  it('clusterlevel', () => {
    const msg = new Message(MESSAGE_TYPE.PING, uint8ArrayFromString('hello'), 0)

    msg.clusterLevel = 10
    expect(msg.clusterLevel).to.eql(9)
  })

  it('go-interop', () => {
    range(1, 9).forEach((i) => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'test', 'fixtures', `msg-${i}`)
      )

      const msg = Message.deserialize(raw)

      expect(msg.clusterLevel).to.gte(0)
      if (msg.record != null) {
        expect(msg.record.key).to.be.a('Uint8Array')
      }

      if (msg.providerPeers.length > 0) {
        msg.providerPeers.forEach((p) => {
          expect(isPeerId(p.id)).to.be.true()
        })
      }
    })
  })
})
