'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const defer = require('p-defer')
const mergeOptions = require('merge-options')

const WebRTCStar = require('libp2p-webrtc-star')

const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options.browser')
const { createPeerInfo } = require('../utils/creators/peer')
const { EventEmitter } = require('events')

describe('peer discovery', () => {
  describe('basic functions', () => {
    let peerInfo
    let remotePeerInfo
    let libp2p

    before(async () => {
      [peerInfo, remotePeerInfo] = await createPeerInfo({ number: 2 })
    })

    afterEach(async () => {
      libp2p && await libp2p.stop()
      sinon.reset()
    })

    it('should dial know peers on startup', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerInfo
      })
      libp2p.peerStore.addressBook.set(remotePeerInfo.id, remotePeerInfo.multiaddrs.toArray())
      libp2p.peerStore.protoBook.set(remotePeerInfo.id, Array.from(remotePeerInfo.protocols))

      const deferred = defer()
      sinon.stub(libp2p.dialer, 'connectToPeer').callsFake((remotePeerInfo) => {
        expect(remotePeerInfo).to.equal(remotePeerInfo)
        deferred.resolve()
      })
      const spy = sinon.spy()
      libp2p.on('peer:discovery', spy)

      libp2p.start()
      await deferred.promise

      expect(spy.calledOnce).to.eql(true)
      expect(spy.getCall(0).args[0].id.toString()).to.eql(remotePeerInfo.id.toString())
    })

    it('should ignore self on discovery', async () => {
      const mockDiscovery = new EventEmitter()
      mockDiscovery.tag = 'mock'
      mockDiscovery.start = () => {}
      mockDiscovery.stop = () => {}

      libp2p = new Libp2p(mergeOptions(baseOptions, {
        peerInfo,
        modules: {
          peerDiscovery: [mockDiscovery]
        }
      }))

      await libp2p.start()
      const discoverySpy = sinon.spy()
      libp2p.on('peer:discovery', discoverySpy)
      libp2p._discovery.get('mock').emit('peer', libp2p.peerInfo)

      expect(discoverySpy.called).to.eql(false)
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
        peerInfo,
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
    let peerInfo, libp2p

    before(async () => {
      [peerInfo] = await createPeerInfo()
    })

    it('should add discovery module if present in transports and enabled', async () => {
      libp2p = new Libp2p(mergeOptions(baseOptions, {
        peerInfo,
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
        peerInfo,
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
