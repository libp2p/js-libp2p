import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import * as utils from '../src/utils.js'
import { createPeerIdWithPrivateKey, createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'

describe('kad utils', () => {
  describe('bufferToKey', () => {
    it('returns the base32 encoded key of the buffer', () => {
      const buf = uint8ArrayFromString('hello world')

      const key = utils.bufferToKey(buf)

      expect(key.toString())
        .to.equal('/' + uint8ArrayToString(buf, 'base32'))
    })
  })

  describe('bufferToRecordKey', () => {
    it('returns the base32 encoded key of the buffer with the record prefix', () => {
      const buf = uint8ArrayFromString('hello world')

      const key = utils.bufferToRecordKey('/dht/record', buf)

      expect(key.toString())
        .to.equal('/dht/record/' + uint8ArrayToString(buf, 'base32'))
    })
  })

  describe('convertBuffer', () => {
    it('returns the sha2-256 hash of the buffer', async () => {
      const buf = uint8ArrayFromString('hello world')
      const digest = await utils.convertBuffer(buf)

      expect(digest)
        .to.equalBytes(uint8ArrayFromString('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9', 'base16'))
    })
  })

  describe('keyForPublicKey', () => {
    it('works', async () => {
      const peer = await createPeerIdWithPrivateKey()
      expect(utils.keyForPublicKey(peer.peerId))
        .to.eql(uint8ArrayConcat([uint8ArrayFromString('/pk/'), peer.peerId.toMultihash().bytes]))
    })
  })

  describe('fromPublicKeyKey', () => {
    it('round trips', async function () {
      this.timeout(40 * 1000)

      const peers = await createPeerIdsWithPrivateKey(50)
      peers.forEach((id, i) => {
        expect(utils.isPublicKeyKey(utils.keyForPublicKey(id.peerId))).to.eql(true)
        expect(utils.fromPublicKeyKey(utils.keyForPublicKey(id.peerId)).toMultihash().bytes)
          .to.eql(id.peerId.toMultihash().bytes)
      })
    })
  })

  describe('removePrivateAddresses', () => {
    it('filters private multiaddrs', async () => {
      const id = await createPeerIdWithPrivateKey()

      const multiaddrs = [
        multiaddr('/dns4/example.com/tcp/4001'),
        multiaddr('/ip4/192.168.0.1/tcp/4001'),
        multiaddr('/ip4/1.1.1.1/tcp/4001'),
        multiaddr('/dns4/localhost/tcp/4001')
      ]

      const peerInfo = utils.removePrivateAddressesMapper({ id: id.peerId, multiaddrs })
      expect(peerInfo.multiaddrs.map((ma) => ma.toString()))
        .to.eql(['/dns4/example.com/tcp/4001', '/ip4/1.1.1.1/tcp/4001'])
    })
  })

  describe('removePublicAddresses', () => {
    it('filters public multiaddrs', async () => {
      const id = await createPeerIdWithPrivateKey()

      const multiaddrs = [
        multiaddr('/dns4/example.com/tcp/4001'),
        multiaddr('/ip4/192.168.0.1/tcp/4001'),
        multiaddr('/ip4/1.1.1.1/tcp/4001'),
        multiaddr('/dns4/localhost/tcp/4001')
      ]

      const peerInfo = utils.removePublicAddressesMapper({ id: id.peerId, multiaddrs })
      expect(peerInfo.multiaddrs.map((ma) => ma.toString()))
        .to.eql(['/ip4/192.168.0.1/tcp/4001', '/dns4/localhost/tcp/4001'])
    })
  })
})
