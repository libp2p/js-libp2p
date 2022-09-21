/* eslint-env mocha */

import { expect } from 'aegir/chai'
import tests from '@libp2p/interface-record-compliance-tests'
import { multiaddr } from '@multiformats/multiaddr'
import { peerIdFromKeys } from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { RecordEnvelope } from '../src/envelope/index.js'
import { PeerRecord } from '../src/peer-record/index.js'
import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import type { PeerId } from '@libp2p/interface-peer-id'

describe('interface-record compliance', () => {
  tests({
    async setup () {
      const peerId = await createEd25519PeerId()
      return new PeerRecord({ peerId })
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})

describe('PeerRecord', () => {
  let peerId: PeerId

  before(async () => {
    peerId = await createEd25519PeerId()
  })

  it('de/serializes the same as a go record', async () => {
    const privKey = Uint8Array.from([8, 1, 18, 64, 133, 251, 231, 43, 96, 100, 40, 144, 4, 165, 49, 249, 103, 137, 141, 245, 49, 158, 224, 41, 146, 253, 216, 64, 33, 250, 80, 82, 67, 75, 246, 238, 17, 187, 163, 237, 23, 33, 148, 140, 239, 180, 229, 11, 10, 11, 181, 202, 216, 166, 181, 45, 199, 177, 164, 15, 79, 102, 82, 16, 92, 145, 226, 196])
    const rawEnvelope = Uint8Array.from([10, 36, 8, 1, 18, 32, 17, 187, 163, 237, 23, 33, 148, 140, 239, 180, 229, 11, 10, 11, 181, 202, 216, 166, 181, 45, 199, 177, 164, 15, 79, 102, 82, 16, 92, 145, 226, 196, 18, 2, 3, 1, 26, 170, 1, 10, 38, 0, 36, 8, 1, 18, 32, 17, 187, 163, 237, 23, 33, 148, 140, 239, 180, 229, 11, 10, 11, 181, 202, 216, 166, 181, 45, 199, 177, 164, 15, 79, 102, 82, 16, 92, 145, 226, 196, 16, 216, 184, 224, 191, 147, 145, 182, 151, 22, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 0, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 1, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 2, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 3, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 4, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 5, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 6, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 7, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 8, 26, 10, 10, 8, 4, 1, 2, 3, 4, 6, 0, 9, 42, 64, 177, 151, 247, 107, 159, 40, 138, 242, 180, 103, 254, 102, 111, 119, 68, 118, 40, 112, 73, 180, 36, 183, 57, 117, 200, 134, 14, 251, 2, 55, 45, 2, 106, 121, 149, 132, 84, 26, 215, 47, 38, 84, 52, 100, 133, 188, 163, 236, 227, 100, 98, 183, 209, 177, 57, 28, 141, 39, 109, 196, 171, 139, 202, 11])
    const key = await unmarshalPrivateKey(privKey)
    const peerId = await peerIdFromKeys(key.public.bytes, key.bytes)

    const env = await RecordEnvelope.openAndCertify(rawEnvelope, PeerRecord.DOMAIN)
    expect(peerId.equals(env.peerId))

    const record = PeerRecord.createFromProtobuf(env.payload)

    // The payload isn't going to match because of how the protobuf encodes uint64 values
    // They are marshalled correctly on both sides, but will be off by 1 value
    // Signatures will still be validated
    const jsEnv = await RecordEnvelope.seal(record, peerId)
    expect(env.payloadType).to.eql(jsEnv.payloadType)
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
    const seqNumber = BigInt(Date.now())
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
    const seqNumber = BigInt(Date.now())
    const peerRecord = new PeerRecord({ peerId, multiaddrs, seqNumber })

    // Marshal
    const rawData = peerRecord.marshal()
    expect(rawData).to.exist()

    // Unmarshal
    const unmarshalPeerRecord = PeerRecord.createFromProtobuf(rawData)
    expect(unmarshalPeerRecord).to.exist()

    const equals = peerRecord.equals(unmarshalPeerRecord)
    expect(equals).to.eql(true)
  })

  it('equals returns false if the peer record has a different peerId', async () => {
    const peerRecord0 = new PeerRecord({ peerId })

    const peerId1 = await createEd25519PeerId()
    const peerRecord1 = new PeerRecord({ peerId: peerId1 })

    const equals = peerRecord0.equals(peerRecord1)
    expect(equals).to.eql(false)
  })

  it('equals returns false if the peer record has a different seqNumber', () => {
    const ts0 = BigInt(Date.now())
    const peerRecord0 = new PeerRecord({ peerId, seqNumber: ts0 })

    const ts1 = ts0 + 20n
    const peerRecord1 = new PeerRecord({ peerId, seqNumber: ts1 })

    const equals = peerRecord0.equals(peerRecord1)
    expect(equals).to.eql(false)
  })

  it('equals returns false if the peer record has a different multiaddrs', () => {
    const multiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/2000')
    ]
    const peerRecord0 = new PeerRecord({ peerId, multiaddrs })

    const multiaddrs1 = [
      multiaddr('/ip4/127.0.0.1/tcp/2001')
    ]
    const peerRecord1 = new PeerRecord({ peerId, multiaddrs: multiaddrs1 })

    const equals = peerRecord0.equals(peerRecord1)
    expect(equals).to.eql(false)
  })
})

describe('PeerRecord inside Envelope', () => {
  let peerId: PeerId
  let peerRecord: PeerRecord

  before(async () => {
    peerId = await createEd25519PeerId()
    const multiaddrs = [
      multiaddr('/ip4/127.0.0.1/tcp/2000')
    ]
    const seqNumber = BigInt(Date.now())
    peerRecord = new PeerRecord({ peerId, multiaddrs, seqNumber })
  })

  it('creates an envelope with the PeerRecord and can unmarshal it', async () => {
    const e = await RecordEnvelope.seal(peerRecord, peerId)
    const byteE = e.marshal()

    const decodedE = await RecordEnvelope.openAndCertify(byteE, PeerRecord.DOMAIN)
    expect(decodedE).to.exist()

    const decodedPeerRecord = PeerRecord.createFromProtobuf(decodedE.payload)

    const equals = peerRecord.equals(decodedPeerRecord)
    expect(equals).to.eql(true)
  })
})
