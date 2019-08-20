/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-checkmark'))
const expect = chai.expect
const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const nextTick = require('async/nextTick')

const LimitDialer = require('../../src/switch/limit-dialer')
const utils = require('./utils')

describe('LimitDialer', () => {
  let peers

  before((done) => {
    utils.createInfos(5, (err, infos) => {
      if (err) {
        return done(err)
      }
      peers = infos

      peers.forEach((peer, i) => {
        peer.multiaddrs.add(multiaddr(`/ip4/191.0.0.1/tcp/123${i}`))
        peer.multiaddrs.add(multiaddr(`/ip4/192.168.0.1/tcp/923${i}`))
        peer.multiaddrs.add(multiaddr(`/ip4/193.168.0.99/tcp/923${i}`))
      })
      done()
    })
  })

  it('all failing', (done) => {
    const dialer = new LimitDialer(2, 10)
    const error = new Error('fail')
    // mock transport
    const t1 = {
      dial (addr, cb) {
        nextTick(cb, error)
        return {}
      }
    }

    dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray(), (err, conn) => {
      expect(err).to.exist()
      expect(err).to.include.members([error, error, error])
      expect(conn).to.not.exist()
      done()
    })
  })

  it('two success', (done) => {
    const dialer = new LimitDialer(2, 10)

    // mock transport
    const t1 = {
      dial (addr, cb) {
        const as = addr.toString()
        if (as.match(/191/)) {
          nextTick(cb, new Error('fail'))
          return null
        } else if (as.match(/192/)) {
          nextTick(cb)
          return {
            source: pull.values([1]),
            sink: pull.drain()
          }
        } else if (as.match(/193/)) {
          nextTick(cb)
          return {
            source: pull.values([2]),
            sink: pull.drain()
          }
        }
      }
    }

    dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs.toArray(), (err, success) => {
      const conn = success.conn
      expect(success.multiaddr.toString()).to.equal('/ip4/192.168.0.1/tcp/9230')
      expect(err).to.not.exist()
      pull(
        conn,
        pull.collect((err, res) => {
          expect(err).to.not.exist()
          expect(res).to.be.eql([1])
          done()
        })
      )
    })
  })
})
