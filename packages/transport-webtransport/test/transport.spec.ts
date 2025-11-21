/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { webTransport, isChrome, hasDNSComponent } from '../src/index.js'
import type { WebTransportComponents } from '../src/index.js'
import type { Upgrader } from '@libp2p/interface'

describe('WebTransport Transport', () => {
  let components: WebTransportComponents

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>()
    }
  })

  it('transport filter filters out invalid dial multiaddrs', async () => {
    const valid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]
    const invalid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd/p2p-circuit/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'),
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]

    const t = webTransport()(components)

    expect(t.dialFilter([
      ...valid,
      ...invalid
    ])).to.deep.equal(valid)
  })
})

describe('Chrome DNS Pre-Resolution', () => {
  describe('isChrome()', () => {
    let originalNavigator: Navigator | undefined
    let originalUserAgent: string | undefined

    beforeEach(() => {
      // Store original navigator
      originalNavigator = globalThis.navigator
      originalUserAgent = globalThis.navigator?.userAgent
    })

    afterEach(() => {
      // Restore original navigator
      if (originalNavigator !== undefined) {
        Object.defineProperty(globalThis, 'navigator', {
          value: originalNavigator,
          configurable: true,
          writable: true
        })
      }
    })

    it('should detect Chrome user agent', () => {
      // Mock Chrome user agent
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        configurable: true,
        writable: true
      })

      expect(isChrome()).to.equal(true)
    })

    it('should not detect Firefox as Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0'
        },
        configurable: true,
        writable: true
      })

      expect(isChrome()).to.equal(false)
    })

    it('should not detect Edge as Chrome', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
        },
        configurable: true,
        writable: true
      })

      expect(isChrome()).to.equal(false)
    })

    it('should return false when navigator is undefined', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: undefined,
        configurable: true,
        writable: true
      })

      expect(isChrome()).to.equal(false)
    })
  })

  describe('hasDNSComponent()', () => {
    it('should detect dns4 component', () => {
      const ma = multiaddr('/dns4/example.com/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      expect(hasDNSComponent(ma)).to.equal(true)
    })

    it('should detect dns6 component', () => {
      const ma = multiaddr('/dns6/example.com/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      expect(hasDNSComponent(ma)).to.equal(true)
    })

    it('should detect dnsaddr component', () => {
      const ma = multiaddr('/dnsaddr/example.com/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      expect(hasDNSComponent(ma)).to.equal(true)
    })

    it('should not detect DNS in IP-based multiaddr', () => {
      const ma = multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      expect(hasDNSComponent(ma)).to.equal(false)
    })

    it('should not detect DNS in IPv6-based multiaddr', () => {
      const ma = multiaddr('/ip6/::1/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      expect(hasDNSComponent(ma)).to.equal(false)
    })
  })

  describe('dialFilter with DNS multiaddrs', () => {
    let components: WebTransportComponents

    beforeEach(async () => {
      const privateKey = await generateKeyPair('Ed25519')

      components = {
        peerId: peerIdFromPrivateKey(privateKey),
        privateKey,
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>()
      }
    })

    it('should accept DNS-based multiaddrs', () => {
      const dnsMultiaddr = multiaddr('/dns4/example.com/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      
      const t = webTransport()(components)
      
      // Test that DNS multiaddrs are accepted
      const filtered = t.dialFilter([dnsMultiaddr])
      expect(filtered).to.have.length(1)
      expect(filtered[0].toString()).to.equal(dnsMultiaddr.toString())
    })

    it('should accept both IP and DNS multiaddrs', () => {
      const ipMultiaddr = multiaddr('/ip4/1.2.3.4/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      const dnsMultiaddr = multiaddr('/dns4/example.com/udp/1234/quic-v1/webtransport/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
      
      const t = webTransport()(components)
      
      const filtered = t.dialFilter([ipMultiaddr, dnsMultiaddr])
      expect(filtered).to.have.length(2)
    })
  })
})
