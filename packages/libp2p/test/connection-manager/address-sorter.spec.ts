/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { defaultAddressSorter } from '../../src/connection-manager/address-sorter.js'

describe('address-sort', () => {
  describe('public addresses first', () => {
    it('should sort public addresses first', () => {
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }

      const addresses = [
        privateAddress,
        publicAddress
      ]

      const sortedAddresses = defaultAddressSorter(addresses)
      expect(sortedAddresses).to.deep.equal([
        publicAddress,
        privateAddress
      ])
    })
  })

  describe('certified addresses first', () => {
    it('should sort certified addresses first', () => {
      const certifiedPublicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001'),
        isCertified: true
      }
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPrivateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }

      const addresses = [
        publicAddress,
        certifiedPublicAddress,
        certifiedPrivateAddress,
        privateAddress
      ]

      const sortedAddresses = defaultAddressSorter(addresses)
      expect(sortedAddresses).to.deep.equal([
        certifiedPublicAddress,
        publicAddress,
        certifiedPrivateAddress,
        privateAddress
      ])
    })
  })

  describe('circuit relay addresses last', () => {
    it('should sort circuit relay addresses last', () => {
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }

      const addresses = [
        publicRelay,
        publicAddress
      ]

      const sortedAddresses = defaultAddressSorter(addresses)
      expect(sortedAddresses).to.deep.equal([
        publicAddress,
        publicRelay
      ])
    })
  })

  describe('default address sort', () => {
    it('should sort public, then public relay, then private, then private relay with certified addresses taking priority', () => {
      const certifiedPublicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001'),
        isCertified: true
      }
      const publicAddress = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPublicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: true
      }
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }
      const certifiedPrivateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001'),
        isCertified: true
      }
      const privateAddress = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000'),
        isCertified: false
      }
      const certifiedPrivateRelay = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4001/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: true
      }
      const privateRelay = {
        multiaddr: multiaddr('/ip4/127.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }

      const addresses = [
        privateAddress,
        certifiedPrivateAddress,
        publicRelay,
        certifiedPublicRelay,
        privateRelay,
        publicAddress,
        certifiedPublicAddress,
        certifiedPrivateRelay
      ].sort(() => {
        return Math.random() > 0.5 ? -1 : 1
      })

      const sortedAddresses = defaultAddressSorter(addresses)

      expect(sortedAddresses).to.deep.equal([
        certifiedPublicAddress,
        publicAddress,
        certifiedPublicRelay,
        publicRelay,
        certifiedPrivateAddress,
        privateAddress,
        certifiedPrivateRelay,
        privateRelay
      ])
    })

    it('should sort WebRTC over relay addresses before relay addresses', () => {
      const publicRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }
      const webRTCOverRelay = {
        multiaddr: multiaddr('/ip4/30.0.0.1/tcp/4000/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/webrtc/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'),
        isCertified: false
      }

      const addresses = [
        publicRelay,
        webRTCOverRelay
      ].sort(() => {
        return Math.random() > 0.5 ? -1 : 1
      })

      const sortedAddresses = defaultAddressSorter(addresses)
      expect(sortedAddresses).to.deep.equal([
        webRTCOverRelay,
        publicRelay
      ])
    })

    it('should sort reliable addresses first', () => {
      const tcp = multiaddr('/ip4/123.123.123.123/tcp/123/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const ws = multiaddr('/ip4/123.123.123.123/tcp/123/ws/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const wss = multiaddr('/ip4/123.123.123.123/tcp/123/wss/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const webRTC = multiaddr('/ip4/123.123.123.123/tcp/123/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/webrtc/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const webRTCDirect = multiaddr('/ip4/123.123.123.123/udp/123/webrtc-direct/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const circuitRelay = multiaddr('/ip4/123.123.123.123/tcp/123/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
      const webTransport = multiaddr('/ip4/123.123.123.123/udp/123/quic-v1/webtransport/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')

      const addresses = [tcp, ws, wss, webRTC, webRTCDirect, circuitRelay, webTransport]
        .sort(() => Math.random() < 0.5 ? -1 : 1)
        .map(multiaddr => ({
          multiaddr,
          isCertified: true
        }))

      const sortedAddresses = defaultAddressSorter(addresses)
        .map(({ multiaddr }) => multiaddr.toString())

      expect(sortedAddresses).to.deep.equal([
        tcp,
        wss,
        ws,
        webRTC,
        webRTCDirect,
        webTransport,
        circuitRelay
      ].map(ma => ma.toString()))
    })
  })

  it('should sort public, local then loopback addresses', () => {
    const pub = multiaddr('/ip4/80.123.123.123/tcp/123/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
    const classB = multiaddr('/ip4/172.123.123.123/tcp/123/ws/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
    const tcpLoopback = multiaddr('/ip4/127.0.0.1/tcp/123/ws/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
    const webRTCDirectLoopback = multiaddr('/ip4/127.0.0.1/udp/43543/webrtc-direct/certhash/uEiCJOmJR6bCtNcRVjdcGXQGxr4L5oPjg4G02FP35aCwIog/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')
    const webRTCDirectClassB = multiaddr('/ip4/172.20.0.4/udp/43543/webrtc-direct/certhash/uEiCJOmJR6bCtNcRVjdcGXQGxr4L5oPjg4G02FP35aCwIog/p2p/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm')

    const addresses = [pub, classB, tcpLoopback, webRTCDirectLoopback, webRTCDirectClassB]
      .sort(() => Math.random() < 0.5 ? -1 : 1)
      .map(multiaddr => ({
        multiaddr,
        isCertified: true
      }))

    const sortedAddresses = defaultAddressSorter(addresses)
      .map(({ multiaddr }) => multiaddr.toString())

    expect(sortedAddresses).to.deep.equal([
      pub,
      classB,
      webRTCDirectClassB,
      tcpLoopback,
      webRTCDirectLoopback
    ].map(ma => ma.toString()))
  })
})
