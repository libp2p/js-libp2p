/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const PeerInfo = require('peer-info')
const PeerId = require('peer-id')
const waterfall = require('async/waterfall')
const WS = require('libp2p-websockets')
const defaultsDeep = require('@nodeutils/defaults-deep')
const DHT = require('libp2p-kad-dht')

const Libp2p = require('../src')

describe('private network', () => {
  let config

  before((done) => {
    waterfall([
      (cb) => PeerId.create({ bits: 512 }, cb),
      (peerId, cb) => PeerInfo.create(peerId, cb),
      (peerInfo, cb) => {
        config = {
          peerInfo,
          modules: {
            transport: [WS],
            dht: DHT
          }
        }
        cb()
      }
    ], () => done())
  })

  describe('enforced network protection', () => {
    before(() => {
      process.env.LIBP2P_FORCE_PNET = 1
    })

    after(() => {
      delete process.env.LIBP2P_FORCE_PNET
    })

    it('should throw an error without a provided protector', () => {
      expect(() => {
        return new Libp2p(config)
      }).to.throw('Private network is enforced, but no protector was provided')
    })

    it('should create a libp2p node with a provided protector', () => {
      let node
      const protector = {
        psk: '123',
        tag: '/psk/1.0.0',
        protect: () => { }
      }

      expect(() => {
        const options = defaultsDeep(config, {
          modules: {
            connProtector: protector
          }
        })

        node = new Libp2p(options)
        return node
      }).to.not.throw()
      expect(node._switch.protector).to.deep.equal(protector)
    })

    it('should throw an error if the protector does not have a protect method', () => {
      expect(() => {
        const options = defaultsDeep(config, {
          modules: {
            connProtector: { }
          }
        })

        return new Libp2p(options)
      }).to.throw()
    })
  })

  describe('network protection not enforced', () => {
    it('should not throw an error with no provided protector', () => {
      expect(() => {
        return new Libp2p(config)
      }).to.not.throw()
    })
  })
})
