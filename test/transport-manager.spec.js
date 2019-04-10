/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const Multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')

const TransportManager = require('../src/transport')

describe('Transport Manager', () => {
  describe('dialables', () => {
    let peerInfo
    const dialAllTransport = { filter: addrs => addrs }

    beforeEach(done => {
      PeerInfo.create((err, info) => {
        if (err) return done(err)
        peerInfo = info
        done()
      })
    })

    it('should return all transport addresses when peer info has 0 addrs', () => {
      const queryAddrs = [
        '/ip4/127.0.0.1/tcp/4002',
        '/ip4/192.168.0.3/tcp/4002',
        '/ip6/::1/tcp/4001'
      ].map(a => Multiaddr(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo)

      expect(dialableAddrs).to.have.length(queryAddrs.length)

      queryAddrs.forEach(qa => {
        expect(dialableAddrs.some(da => da.equals(qa))).to.be.true()
      })
    })

    it('should return all transport addresses when we pass no peer info', () => {
      const queryAddrs = [
        '/ip4/127.0.0.1/tcp/4002',
        '/ip4/192.168.0.3/tcp/4002',
        '/ip6/::1/tcp/4001'
      ].map(a => Multiaddr(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs)

      expect(dialableAddrs).to.have.length(queryAddrs.length)

      queryAddrs.forEach(qa => {
        expect(dialableAddrs.some(da => da.equals(qa))).to.be.true()
      })
    })

    it('should filter our addresses', () => {
      const queryAddrs = [
        '/ip4/127.0.0.1/tcp/4002',
        '/ip4/192.168.0.3/tcp/4002',
        '/ip6/::1/tcp/4001'
      ].map(a => Multiaddr(a))

      const ourAddrs = [
        '/ip4/127.0.0.1/tcp/4002',
        '/ip4/192.168.0.3/tcp/4002'
      ]

      ourAddrs.forEach(a => peerInfo.multiaddrs.add(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo)

      expect(dialableAddrs).to.have.length(1)
      expect(dialableAddrs[0].toString()).to.equal('/ip6/::1/tcp/4001')
    })

    it('should filter our addresses with peer ID suffix', () => {
      const queryAddrs = [
        '/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j',
        '/ip4/192.168.0.3/tcp/4002',
        '/ip6/::1/tcp/4001'
      ].map(a => Multiaddr(a))

      const ourAddrs = [
        `/ip4/127.0.0.1/tcp/4002`,
        `/ip4/192.168.0.3/tcp/4002/ipfs/${peerInfo.id.toB58String()}`
      ]

      ourAddrs.forEach(a => peerInfo.multiaddrs.add(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo)

      expect(dialableAddrs).to.have.length(1)
      expect(dialableAddrs[0].toString()).to.equal('/ip6/::1/tcp/4001')
    })

    it('should filter our addresses over relay/rendezvous', () => {
      const peerId = peerInfo.id.toB58String()
      const queryAddrs = [
        `/p2p-circuit/ipfs/${peerId}`,
        `/p2p-circuit/ip4/127.0.0.1/tcp/4002`,
        `/p2p-circuit/ip4/192.168.0.3/tcp/4002`,
        `/p2p-circuit/ip4/127.0.0.1/tcp/4002/ipfs/${peerId}`,
        `/p2p-circuit/ip4/192.168.0.3/tcp/4002/ipfs/${peerId}`,
        `/p2p-circuit/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j`,
        `/p2p-circuit/ip4/192.168.0.3/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j`,
        `/p2p-webrtc-star/ipfs/${peerId}`,
        `/p2p-websocket-star/ipfs/${peerId}`,
        `/p2p-stardust/ipfs/${peerId}`,
        '/ip6/::1/tcp/4001'
      ].map(a => Multiaddr(a))

      const ourAddrs = [
        `/ip4/127.0.0.1/tcp/4002`,
        `/ip4/192.168.0.3/tcp/4002/ipfs/${peerInfo.id.toB58String()}`
      ]

      ourAddrs.forEach(a => peerInfo.multiaddrs.add(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo)

      expect(dialableAddrs).to.have.length(1)
      expect(dialableAddrs[0].toString()).to.equal('/ip6/::1/tcp/4001')
    })
  })
})
