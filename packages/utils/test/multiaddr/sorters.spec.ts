import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import {
  reliableTransportsFirst,
  loopbackAddressLast,
  publicAddressesFirst,
  circuitRelayAddressesLast
} from '../../src/multiaddr/sorters.js'

describe('multiaddr sorters', () => {
  describe('reliableTransportsFirst', () => {
    it('orders TCP before WebSocketsSecure', () => {
      const tcp = multiaddr('/ip4/123.123.123.123/tcp/123')
      const wss = multiaddr('/ip4/123.123.123.123/tcp/123/wss')
      expect(reliableTransportsFirst(tcp, wss)).to.equal(-1)
      expect(reliableTransportsFirst(wss, tcp)).to.equal(1)
    })

    it('orders WebSocketsSecure before WebSockets', () => {
      const wss = multiaddr('/ip4/123.123.123.123/tcp/123/wss')
      const ws = multiaddr('/ip4/123.123.123.123/tcp/123/ws')
      expect(reliableTransportsFirst(wss, ws)).to.equal(-1)
      expect(reliableTransportsFirst(ws, wss)).to.equal(1)
    })

    it('orders WebRTCDirect before WebTransport', () => {
      const webRTCDirect = multiaddr('/ip4/123.123.123.123/udp/123/webrtc-direct/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const webTransport = multiaddr('/ip4/123.123.123.123/udp/123/quic-v1/webtransport/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
      expect(reliableTransportsFirst(webRTCDirect, webTransport)).to.equal(-1)
      expect(reliableTransportsFirst(webTransport, webRTCDirect)).to.equal(1)
    })

    it('returns 0 when both addresses share the same transport', () => {
      const tcpA = multiaddr('/ip4/1.1.1.1/tcp/123')
      const tcpB = multiaddr('/ip4/2.2.2.2/tcp/456')
      expect(reliableTransportsFirst(tcpA, tcpB)).to.equal(0)
    })
  })

  describe('loopbackAddressLast', () => {
    it('orders loopback after non-loopback', () => {
      const loopback = multiaddr('/ip4/127.0.0.1/tcp/123')
      const pub = multiaddr('/ip4/123.123.123.123/tcp/123')
      expect(loopbackAddressLast(loopback, pub)).to.equal(1)
      expect(loopbackAddressLast(pub, loopback)).to.equal(-1)
    })

    it('returns 0 when both are loopback', () => {
      const a = multiaddr('/ip4/127.0.0.1/tcp/123')
      const b = multiaddr('/ip4/127.0.0.1/tcp/456')
      expect(loopbackAddressLast(a, b)).to.equal(0)
    })

    it('returns 0 when neither is loopback', () => {
      const a = multiaddr('/ip4/123.123.123.123/tcp/123')
      const b = multiaddr('/ip4/200.0.0.1/tcp/456')
      expect(loopbackAddressLast(a, b)).to.equal(0)
    })
  })

  describe('publicAddressesFirst', () => {
    it('orders public before private', () => {
      const priv = multiaddr('/ip4/192.168.0.1/tcp/123')
      const pub = multiaddr('/ip4/123.123.123.123/tcp/123')
      expect(publicAddressesFirst(pub, priv)).to.equal(-1)
      expect(publicAddressesFirst(priv, pub)).to.equal(1)
    })

    it('returns 0 when both are public', () => {
      const a = multiaddr('/ip4/123.123.123.123/tcp/123')
      const b = multiaddr('/ip4/200.0.0.1/tcp/456')
      expect(publicAddressesFirst(a, b)).to.equal(0)
    })

    it('returns 0 when both are private', () => {
      const a = multiaddr('/ip4/192.168.0.1/tcp/123')
      const b = multiaddr('/ip4/10.0.0.1/tcp/456')
      expect(publicAddressesFirst(a, b)).to.equal(0)
    })
  })

  describe('circuitRelayAddressesLast', () => {
    it('orders relay after non-relay', () => {
      const direct = multiaddr('/ip4/123.123.123.123/tcp/123/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const relay = multiaddr('/ip4/123.123.123.123/tcp/123/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      expect(circuitRelayAddressesLast(direct, relay)).to.equal(-1)
      expect(circuitRelayAddressesLast(relay, direct)).to.equal(1)
    })

    it('returns 0 when both are relay', () => {
      const a = multiaddr('/ip4/1.1.1.1/tcp/123/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const b = multiaddr('/ip4/2.2.2.2/tcp/456/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      expect(circuitRelayAddressesLast(a, b)).to.equal(0)
    })

    it('returns 0 when neither is relay', () => {
      const a = multiaddr('/ip4/1.1.1.1/tcp/123')
      const b = multiaddr('/ip4/2.2.2.2/tcp/456')
      expect(circuitRelayAddressesLast(a, b)).to.equal(0)
    })
  })
})
