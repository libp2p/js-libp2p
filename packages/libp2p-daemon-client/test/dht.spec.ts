/* eslint-env mocha */

import { createServer } from '@libp2p/daemon-server'
import { MessageType, EventTypes } from '@libp2p/kad-dht'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createClient } from '../src/index.js'
import { matchBytes } from './fixtures/match-bytes.js'
import type { DaemonClient } from '../src/index.js'
import type { Libp2pServer } from '@libp2p/daemon-server'
import type { GossipSub } from '@libp2p/gossipsub'
import type { Libp2p } from '@libp2p/interface'
import type { ValueEvent, FinalPeerEvent, PeerResponseEvent, KadDHT } from '@libp2p/kad-dht'
import type { StubbedInstance } from 'sinon-ts'

const defaultMultiaddr = multiaddr('/ip4/0.0.0.0/tcp/12345')

function matchCid (cid: CID): sinon.SinonMatcher {
  return sinon.match((c: CID) => c.toString() === cid.toString(), 'cid')
}

describe('daemon dht client', function () {
  this.timeout(30e3)

  let libp2p: StubbedInstance<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>
  let server: Libp2pServer
  let client: DaemonClient
  let dht: StubbedInstance<KadDHT>

  beforeEach(async function () {
    dht = stubInterface<KadDHT>()
    libp2p = stubInterface<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>()
    libp2p.services.dht = dht

    server = createServer(defaultMultiaddr, libp2p)

    await server.start()

    client = createClient(server.getMultiaddr())
  })

  afterEach(async () => {
    if (server != null) {
      await server.stop()
    }

    sinon.restore()
  })

  describe('put', () => {
    const key = uint8ArrayFromString('/key')
    const value = uint8ArrayFromString('oh hello there')

    it('should be able to put a value to the dht', async function () {
      dht.put.returns(async function * () {}())

      await client.dht.put(key, value)

      expect(dht.put.calledWith(matchBytes(key), matchBytes(value))).to.be.true()
    })

    it('should error if receive an error message', async () => {
      dht.put.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(client.dht.put(key, value)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('get', () => {
    it('should be able to get a value from the dht', async function () {
      const key = uint8ArrayFromString('/key')
      const value = uint8ArrayFromString('oh hello there')

      dht.get.withArgs(matchBytes(key)).returns(async function * () {
        const event: ValueEvent = {
          name: 'VALUE',
          type: EventTypes.VALUE,
          value,
          from: peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa'),
          path: {
            index: 0,
            running: 0,
            queued: 0,
            total: 0
          }
        }

        yield event
      }())

      const result = await client.dht.get(key)

      expect(result).to.equalBytes(value)
    })

    it('should error if receive an error message', async function () {
      const key = uint8ArrayFromString('/key')

      dht.get.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(client.dht.get(key)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('findPeer', () => {
    it('should be able to find a peer', async () => {
      const id = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa')

      dht.findPeer.withArgs(id).returns(async function * () {
        const event: FinalPeerEvent = {
          name: 'FINAL_PEER',
          type: EventTypes.FINAL_PEER,
          peer: {
            id,
            multiaddrs: []
          },
          from: peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa'),
          path: {
            index: 0,
            running: 0,
            queued: 0,
            total: 0
          }
        }

        yield event
      }())

      const result = await client.dht.findPeer(id)

      expect(result.id.equals(id)).to.be.true()
    })

    it('should error if receive an error message', async () => {
      const id = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa')

      dht.findPeer.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(client.dht.findPeer(id)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('provide', () => {
    it('should be able to provide', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')

      dht.provide.returns(async function * () {}())

      await client.dht.provide(cid)

      expect(dht.provide.calledWith(matchCid(cid))).to.be.true()
    })

    it('should error if receive an error message', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')

      dht.provide.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(client.dht.provide(cid)).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('findProviders', () => {
    it('should be able to find providers', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')
      const id = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa')

      dht.findProviders.withArgs(matchCid(cid)).returns(async function * () {
        const event: PeerResponseEvent = {
          name: 'PEER_RESPONSE',
          type: EventTypes.PEER_RESPONSE,
          providers: [{
            id,
            multiaddrs: []
          }],
          closer: [],
          from: id,
          messageName: 'GET_PROVIDERS',
          messageType: MessageType.GET_PROVIDERS,
          path: {
            index: 0,
            running: 0,
            queued: 0,
            total: 0
          }
        }

        yield event
      }())

      const result = await all(client.dht.findProviders(cid))

      expect(result).to.have.lengthOf(1)
      expect(result[0].id.equals(id)).to.be.true()
    })

    // skipped because the protocol doesn't handle streaming errors
    it.skip('should error if receive an error message', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')

      dht.findProviders.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(all(client.dht.findProviders(cid))).to.eventually.be.rejectedWith(/Urk!/)
    })
  })

  describe('getClosestPeers', () => {
    it('should be able to get the closest peers', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')
      const id = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa')

      dht.getClosestPeers.returns(async function * () {
        const event: PeerResponseEvent = {
          name: 'PEER_RESPONSE',
          type: EventTypes.PEER_RESPONSE,
          providers: [],
          closer: [{
            id,
            multiaddrs: []
          }],
          from: id,
          messageName: 'GET_PROVIDERS',
          messageType: MessageType.GET_PROVIDERS,
          path: {
            index: 0,
            running: 0,
            queued: 0,
            total: 0
          }
        }

        yield event
      }())

      const result = await all(client.dht.getClosestPeers(cid.bytes))

      expect(result).to.have.lengthOf(1)
      expect(result[0].id.equals(id)).to.be.true()
    })

    // skipped because the protocol doesn't handle streaming errors
    it.skip('should error if it gets an invalid key', async () => {
      const cid = CID.parse('QmVzw6MPsF96TyXBSRs1ptLoVMWRv5FCYJZZGJSVB2Hp38')

      dht.getClosestPeers.returns(async function * () { // eslint-disable-line require-yield
        throw new Error('Urk!')
      }())

      await expect(all(client.dht.getClosestPeers(cid.bytes))).to.eventually.be.rejectedWith(/Urk!/)
    })
  })
})
