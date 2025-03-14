/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { URL } from '../src/common/url.js'
import { AddressUtils } from '../src/utils/address-utils.js'

describe('001-Address Utilities', () => {
  const TEST_PEER_ID = '12D3KooWKRyzVWW6ChFjQjK4miTSgsociQLhLirqzgKqt9j6W9j7'

  describe('multiaddrToUrl', () => {
    it('should convert insecure multiaddr to http URL', () => {
      const ma = multiaddr(`/ip4/127.0.0.1/tcp/5002/p2p/${TEST_PEER_ID}`)
      const url = AddressUtils.multiaddrToUrl(ma)

      expect(url.protocol).to.equal('http:')
      expect(url.hostname).to.equal(TEST_PEER_ID)
      expect(url.pathname).to.equal('/')
    })

    it('should convert secure multiaddr to https URL', () => {
      const ma = multiaddr(`/ip4/127.0.0.1/tcp/5002/tls/p2p/${TEST_PEER_ID}`)
      const url = AddressUtils.multiaddrToUrl(ma)

      expect(url.protocol).to.equal('https:')
      expect(url.hostname).to.equal(TEST_PEER_ID)
    })

    it('should throw for multiaddr without PeerId', () => {
      const ma = multiaddr('/ip4/127.0.0.1/tcp/5002')
      expect(() => AddressUtils.multiaddrToUrl(ma)).to.throw('Multiaddr must contain a peer ID')
    })
  })

  describe('extractPeerId', () => {
    it('should extract PeerId from multiaddr', () => {
      const ma = multiaddr(`/ip4/127.0.0.1/tcp/5002/p2p/${TEST_PEER_ID}`)
      const peerId = AddressUtils.extractPeerId(ma)
      expect(peerId?.toString()).to.equal(TEST_PEER_ID)
    })

    it('should extract PeerId from URL', () => {
      const url = new URL(`https://${TEST_PEER_ID}/path`)
      const peerId = AddressUtils.extractPeerId(url.toString())
      expect(peerId?.toString()).to.equal(TEST_PEER_ID)
    })

    it('should return undefined for invalid PeerId in url', () => {
      const url = 'https://invalid-peer-id/path'
      const peerId = AddressUtils.extractPeerId(url)
      expect(peerId).to.equal(undefined)
    })
  })

  describe('isMultiaddr', () => {
    it('should return true for valid multiaddr string', () => {
      const maStr = `/ip4/127.0.0.1/tcp/5002/p2p/${TEST_PEER_ID}`
      expect(AddressUtils.isMultiaddr(maStr)).to.equal(true)
    })

    it('should return false for invalid multiaddr string', () => {
      expect(AddressUtils.isMultiaddr('not-a-multiaddr')).to.equal(false)
    })

    it('should return false for URL string', () => {
      expect(AddressUtils.isMultiaddr('https://example.com')).to.equal(false)
    })
  })
})
