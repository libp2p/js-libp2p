/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const multiaddr = require('multiaddr')
const pull = require('pull-stream')
const setImmediate = require('async/setImmediate')

const LimitDialer = require('../src/limit-dialer')
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
        peer.multiaddr.add(
          multiaddr(`/ip4/191.0.0.1/tcp/123${i}`)
        )
        peer.multiaddr.add(
          multiaddr(`/ip4/192.168.0.1/tcp/923${i}`)
        )
        peer.multiaddr.add(
          multiaddr(`/ip4/193.168.0.99/tcp/923${i}`)
        )
      })
      done()
    })
  })

  it('all failing', (done) => {
    const dialer = new LimitDialer(2, 10)

    // mock transport
    const t1 = {
      dial (addr, cb) {
        setTimeout(() => {
          cb(new Error('fail'))
        }, 1)
        return {}
      }
    }

    dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs, (err, conn) => {
      expect(err).to.exist()
      expect(err.errors).to.have.length(3)
      expect(err.errors[0].message).to.eql('fail')
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
          setImmediate(() => cb(new Error('fail')))
          return {}
        } else if (as.match(/192/)) {
          setTimeout(cb, 2)
          return {
            source: pull.values([1]),
            sink: pull.drain()
          }
        } else if (as.match(/193/)) {
          setTimeout(cb, 8)
          return {
            source: pull.values([2]),
            sink: pull.drain()
          }
        }
      }
    }

    dialer.dialMany(peers[0].id, t1, peers[0].multiaddrs, (err, conn) => {
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
