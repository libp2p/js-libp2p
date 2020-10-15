'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const defer = require('p-defer')
const mergeOptions = require('merge-options')

const multiaddr = require('multiaddr')
const WebRTCStar = require('libp2p-webrtc-star')

const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options.browser')
const { createPeerId } = require('../utils/creators/peer')

describe('peer discovery', () => {
  describe('basic functions', () => {
    let peerId
    let remotePeerId
    let libp2p

    before(async () => {
      [peerId, remotePeerId] = await createPeerId({ number: 2 })
    })

    afterEach(async () => {
      libp2p && await libp2p.stop()
      sinon.reset()
    })

    it('should dial know peers on startup below the minConnections watermark', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerId,
        connectionManager: {
          minConnections: 2
        }
      })

      libp2p.peerStore.addressBook.set(remotePeerId, [multiaddr('/ip4/165.1.1.1/tcp/80')])

      const deferred = defer()
      sinon.stub(libp2p.dialer, 'connectToPeer').callsFake((remotePeerId) => {
        expect(remotePeerId).to.equal(remotePeerId)
        deferred.resolve()
      })
      const spy = sinon.spy()
      libp2p.on('peer:discovery', spy)

      libp2p.start()
      await deferred.promise

      expect(spy.calledOnce).to.eql(true)
      expect(spy.getCall(0).args[0].toString()).to.eql(remotePeerId.toString())
    })

    it('should stop discovery on libp2p start/stop', async () => {
      const mockDiscovery = {
        tag: 'mock',
        start: () => {},
        stop: () => {},
        on: () => {},
        removeListener: () => {}
      }
      const startSpy = sinon.spy(mockDiscovery, 'start')
      const stopSpy = sinon.spy(mockDiscovery, 'stop')

      libp2p = new Libp2p(mergeOptions(baseOptions, {
        peerId,
        modules: {
          peerDiscovery: [mockDiscovery]
        }
      }))

      await libp2p.start()
      expect(startSpy).to.have.property('callCount', 1)
      expect(stopSpy).to.have.property('callCount', 0)
      await libp2p.stop()
      expect(startSpy).to.have.property('callCount', 1)
      expect(stopSpy).to.have.property('callCount', 1)
    })
  })

  describe('discovery modules from transports', () => {
    let peerId, libp2p

    before(async () => {
      [peerId] = await createPeerId()
    })

    it('should add discovery module if present in transports and enabled', async () => {
      libp2p = new Libp2p(mergeOptions(baseOptions, {
        peerId,
        modules: {
          transport: [WebRTCStar]
        },
        config: {
          peerDiscovery: {
            webRTCStar: {
              enabled: true
            }
          }
        }
      }))

      await libp2p.start()

      expect(libp2p._discovery.size).to.eql(1)
      expect(libp2p._discovery.has('webRTCStar')).to.eql(true)
    })

    it('should not add discovery module if present in transports but disabled', async () => {
      libp2p = new Libp2p(mergeOptions(baseOptions, {
        peerId,
        modules: {
          transport: [WebRTCStar]
        },
        config: {
          peerDiscovery: {
            webRTCStar: {
              enabled: false
            }
          }
        }
      }))

      await libp2p.start()

      expect(libp2p._discovery.size).to.eql(0)
    })
  })
})
