/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const Multiaddr = require('multiaddr')
const PeerInfo = require('peer-info')
const sinon = require('sinon')

const TransportManager = require('../src/transport')

describe('Transport Manager', () => {
  afterEach(() => {
    sinon.restore()
  })

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

    it('should filter out our addrs that start with /ipfs/', () => {
      const queryAddrs = [
        '/ip4/127.0.0.1/tcp/4002/ipfs/QmebzNV1kSzLfaYpSZdShuiABNUxoKT1vJmCdxM2iWsM2j'
      ].map(a => Multiaddr(a))

      const ourAddrs = [
        '/ipfs/QmSoLnSGccFuZQJzRadHn95W2CrSFmZuTdDWP8HXaHca9z'
      ]

      ourAddrs.forEach(a => peerInfo.multiaddrs.add(a))

      const dialableAddrs = TransportManager.dialables(dialAllTransport, queryAddrs, peerInfo)

      expect(dialableAddrs).to.have.length(1)
      expect(dialableAddrs[0]).to.eql(queryAddrs[0])
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

  describe('listen', () => {
    const listener = {
      once: function () {},
      listen: function () {},
      removeListener: function () {},
      getAddrs: function () {}
    }

    it('should allow for multiple addresses with port 0', (done) => {
      const mockListener = sinon.stub(listener)
      mockListener.listen.callsArg(1)
      mockListener.getAddrs.callsArgWith(0, null, [])
      const mockSwitch = {
        _peerInfo: {
          multiaddrs: {
            toArray: () => [
              Multiaddr('/ip4/127.0.0.1/tcp/0'),
              Multiaddr('/ip4/0.0.0.0/tcp/0')
            ],
            replace: () => {}
          }
        },
        _options: {},
        _connectionHandler: () => {},
        transports: {
          TCP: {
            filter: (addrs) => addrs,
            createListener: () => {
              return mockListener
            }
          }
        }
      }
      const transportManager = new TransportManager(mockSwitch)
      transportManager.listen('TCP', null, null, (err) => {
        expect(err).to.not.exist()
        expect(mockListener.listen.callCount).to.eql(2)
        done()
      })
    })

    it('should filter out equal addresses', (done) => {
      const mockListener = sinon.stub(listener)
      mockListener.listen.callsArg(1)
      mockListener.getAddrs.callsArgWith(0, null, [])
      const mockSwitch = {
        _peerInfo: {
          multiaddrs: {
            toArray: () => [
              Multiaddr('/ip4/127.0.0.1/tcp/0'),
              Multiaddr('/ip4/127.0.0.1/tcp/0')
            ],
            replace: () => {}
          }
        },
        _options: {},
        _connectionHandler: () => {},
        transports: {
          TCP: {
            filter: (addrs) => addrs,
            createListener: () => {
              return mockListener
            }
          }
        }
      }
      const transportManager = new TransportManager(mockSwitch)
      transportManager.listen('TCP', null, null, (err) => {
        expect(err).to.not.exist()
        expect(mockListener.listen.callCount).to.eql(1)
        done()
      })
    })

    it('should account for addresses with no port', (done) => {
      const mockListener = sinon.stub(listener)
      mockListener.listen.callsArg(1)
      mockListener.getAddrs.callsArgWith(0, null, [])
      const mockSwitch = {
        _peerInfo: {
          multiaddrs: {
            toArray: () => [
              Multiaddr('/p2p-circuit'),
              Multiaddr('/p2p-websocket-star')
            ],
            replace: () => {}
          }
        },
        _options: {},
        _connectionHandler: () => {},
        transports: {
          TCP: {
            filter: (addrs) => addrs,
            createListener: () => {
              return mockListener
            }
          }
        }
      }
      const transportManager = new TransportManager(mockSwitch)
      transportManager.listen('TCP', null, null, (err) => {
        expect(err).to.not.exist()
        expect(mockListener.listen.callCount).to.eql(2)
        done()
      })
    })

    it('should filter out addresses with the same, non 0, port', (done) => {
      const mockListener = sinon.stub(listener)
      mockListener.listen.callsArg(1)
      mockListener.getAddrs.callsArgWith(0, null, [])
      const mockSwitch = {
        _peerInfo: {
          multiaddrs: {
            toArray: () => [
              Multiaddr('/ip4/127.0.0.1/tcp/8000'),
              Multiaddr('/dnsaddr/libp2p.io/tcp/8000')
            ],
            replace: () => {}
          }
        },
        _options: {},
        _connectionHandler: () => {},
        transports: {
          TCP: {
            filter: (addrs) => addrs,
            createListener: () => {
              return mockListener
            }
          }
        }
      }
      const transportManager = new TransportManager(mockSwitch)
      transportManager.listen('TCP', null, null, (err) => {
        expect(err).to.not.exist()
        expect(mockListener.listen.callCount).to.eql(1)
        done()
      })
    })
  })
})
