import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { base64url } from 'multiformats/bases/base64'
import { parseMultiaddr } from '../../src/utils/parse-multiaddr.js'

describe('parse multiaddr', () => {
  describe('valid addresses', () => {
    it('parses relay address', () => {
      const relayPeer = '12D3KooWKtv8rpaXJkLCoH4C299wFCVBg1eMzZrPfaV37QVVJrhF'
      const targetPeer = '12D3KooWCDt87xcGVJWmQpaXGTSaevbRpAoMJqvsVuETDrQJvSC5'
      const certHashes = [
        'uEiCvU3clCu16U6Xjh9dzH7yKE2bkGftZw404nYMR6ZXIyg',
        'uEiB8ZfHAe_lEBtxio0KQwmE8mFEesh3p_7-Ac5oOU7HhOw'
      ]

      const ma = multiaddr(`/ip4/154.38.162.255/udp/4001/quic-v1/webtransport/${certHashes.map(c => `certhash/${c}`).join('/')}/p2p/${relayPeer}/p2p-circuit/p2p/${targetPeer}`)
      const { url, certhashes, remotePeer } = parseMultiaddr(ma)

      expect(url).to.equal('https://154.38.162.255:4001')
      expect(certhashes.map(hash => base64url.encode(hash.bytes))).to.deep.equal(certHashes)
      expect(remotePeer?.toString()).to.equal(relayPeer.toString())
    })

    it('parses WebRTC relay address', () => {
      const relayPeer = '12D3KooWKtv8rpaXJkLCoH4C299wFCVBg1eMzZrPfaV37QVVJrhF'
      const targetPeer = '12D3KooWCDt87xcGVJWmQpaXGTSaevbRpAoMJqvsVuETDrQJvSC5'
      const certHashes = [
        'uEiCvU3clCu16U6Xjh9dzH7yKE2bkGftZw404nYMR6ZXIyg',
        'uEiB8ZfHAe_lEBtxio0KQwmE8mFEesh3p_7-Ac5oOU7HhOw'
      ]

      const ma = multiaddr(`/ip4/154.38.162.255/udp/4001/quic-v1/webtransport/${certHashes.map(c => `certhash/${c}`).join('/')}/p2p/${relayPeer}/p2p-circuit/webrtc/p2p/${targetPeer}`)
      const { url, certhashes, remotePeer } = parseMultiaddr(ma)

      expect(url).to.equal('https://154.38.162.255:4001')
      expect(certhashes.map(hash => base64url.encode(hash.bytes))).to.deep.equal(certHashes)
      expect(remotePeer?.toString()).to.equal(relayPeer)
    })

    it('parses ip6 loopback address', () => {
      const targetPeer = '12D3KooWCDt87xcGVJWmQpaXGTSaevbRpAoMJqvsVuETDrQJvSC5'
      const certHashes = [
        'uEiCvU3clCu16U6Xjh9dzH7yKE2bkGftZw404nYMR6ZXIyg',
        'uEiB8ZfHAe_lEBtxio0KQwmE8mFEesh3p_7-Ac5oOU7HhOw'
      ]

      const ma = multiaddr(`/ip6/::1/udp/4001/quic-v1/webtransport/${certHashes.map(c => `certhash/${c}`).join('/')}/p2p/${targetPeer}`)
      const { url, certhashes, remotePeer } = parseMultiaddr(ma)

      expect(url).to.equal('https://[::1]:4001')
      expect(certhashes.map(hash => base64url.encode(hash.bytes))).to.deep.equal(certHashes)
      expect(remotePeer?.toString()).to.equal(targetPeer)
    })
  })

  describe('invalid addresses', () => {
    it('fails to parse a non-webtransport address', () => {
      const targetPeer = '12D3KooWCDt87xcGVJWmQpaXGTSaevbRpAoMJqvsVuETDrQJvSC5'
      const ma = multiaddr(`/ip4/123.123.123.123/udp/4001/p2p/${targetPeer}`)

      expect(() => parseMultiaddr(ma)).to.throw()
        .with.property('name', 'InvalidMultiaddrError')
    })

    it('fails to parse a webtransport address without certhashes', () => {
      const targetPeer = '12D3KooWCDt87xcGVJWmQpaXGTSaevbRpAoMJqvsVuETDrQJvSC5'
      const ma = multiaddr(`/ip4/123.123.123.123/udp/4001/webtransport/p2p/${targetPeer}`)

      expect(() => parseMultiaddr(ma)).to.throw()
        .with.property('name', 'InvalidMultiaddrError')
    })
  })
})
