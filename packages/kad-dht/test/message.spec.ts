/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { Libp2pRecord } from '@libp2p/record'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import random from 'lodash.random'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MessageType } from '../src/message/dht.js'
import { toPbPeerInfo } from '../src/message/utils.js'

describe('Message', () => {
  it('serialize & deserialize', async function () {
    this.timeout(10 * 1000)

    const peers = await Promise.all(
      Array.from({ length: 5 }).map(async () => peerIdFromPrivateKey(await generateKeyPair('Ed25519'))))

    const closer = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        multiaddr(`/ip4/198.176.1.${random(198)}/tcp/1234`),
        multiaddr(`/ip4/100.176.1.${random(198)}`)
      ]
    }))

    const providers = peers.slice(0, 5).map((p) => ({
      id: p,
      multiaddrs: [
        multiaddr(`/ip4/98.176.1.${random(198)}/tcp/1234`),
        multiaddr(`/ip4/10.176.1.${random(198)}`)
      ]
    }))

    const record = new Libp2pRecord(uint8ArrayFromString('hello'), uint8ArrayFromString('world'), new Date())

    const msg: Partial<Message> = {
      type: MessageType.GET_VALUE,
      key: uint8ArrayFromString('hello'),
      closer: closer.map(peer => toPbPeerInfo(peer)),
      providers: providers.map(peer => toPbPeerInfo(peer)),
      record: record.serialize()
    }

    const enc = Message.encode(msg)
    const dec = Message.decode(enc)

    expect(dec.type).to.be.eql(msg.type)
    expect(dec.key).to.be.eql(msg.key)
    expect(dec.clusterLevel).to.be.eql(msg.clusterLevel)

    if (dec.record == null) {
      throw new Error('No record found')
    }

    expect(dec.record).to.equalBytes(record.serialize())

    expect(dec.closer).to.have.length(5)
    dec.closer.forEach((peer, i) => {
      expect(peer.id).equalBytes(msg.closer?.[i].id)
      expect(peer.multiaddrs).to.deep.equal(msg.closer?.[i].multiaddrs)
    })

    expect(dec.providers).to.have.length(5)
    dec.providers.forEach((peer, i) => {
      expect(peer.id).equalBytes(msg.providers?.[i].id)
      expect(peer.multiaddrs).to.deep.equal(msg.providers?.[i].multiaddrs)
    })
  })
})
