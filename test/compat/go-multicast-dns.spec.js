/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const PeerInfo = require('peer-info')
const map = require('async/map')
const series = require('async/series')

const GoMulticastDNS = require('../../src/compat')

describe('GoMulticastDNS', () => {
  const peerAddrs = [
    '/ip4/127.0.0.1/tcp/20001',
    '/ip4/127.0.0.1/tcp/20002'
  ]
  let peerInfos

  before(done => {
    map(peerAddrs, (addr, cb) => {
      PeerInfo.create((err, info) => {
        expect(err).to.not.exist()
        info.multiaddrs.add(addr)
        cb(null, info)
      })
    }, (err, infos) => {
      expect(err).to.not.exist()
      peerInfos = infos
      done()
    })
  })

  it('should start and stop', done => {
    const mdns = new GoMulticastDNS(peerInfos[0])

    mdns.start(err => {
      expect(err).to.not.exist()
      mdns.stop(err => {
        expect(err).to.not.exist()
        done()
      })
    })
  })

  it('should not start when started', done => {
    const mdns = new GoMulticastDNS(peerInfos[0])

    mdns.start(err => {
      expect(err).to.not.exist()

      mdns.start(err => {
        expect(err.message).to.equal('MulticastDNS service is already started')
        mdns.stop(done)
      })
    })
  })

  it('should not stop when not started', done => {
    const mdns = new GoMulticastDNS(peerInfos[0])

    mdns.stop(err => {
      expect(err.message).to.equal('MulticastDNS service is not started')
      done()
    })
  })

  it('should emit peer info when peer is discovered', done => {
    const mdnsA = new GoMulticastDNS(peerInfos[0])
    const mdnsB = new GoMulticastDNS(peerInfos[1])

    mdnsA.on('peer', info => {
      if (!info.id.isEqual(peerInfos[1].id)) return
      expect(info.multiaddrs.has(peerAddrs[1])).to.be.true()
      done()
    })

    series([
      cb => mdnsA.start(cb),
      cb => mdnsB.start(cb)
    ], err => expect(err).to.not.exist())
  })
})
