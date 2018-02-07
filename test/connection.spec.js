/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const TCP = require('../src')
const multiaddr = require('multiaddr')

describe('valid Connection', () => {
  let tcp

  beforeEach(() => {
    tcp = new TCP()
  })

  const ma = multiaddr('/ip4/127.0.0.1/tcp/9090')

  it('get observed addrs', (done) => {
    let dialerObsAddrs

    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist()
      conn.getObservedAddrs((err, addrs) => {
        expect(err).to.not.exist()
        dialerObsAddrs = addrs
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)
      pull(
        conn,
        pull.onEnd(endHandler)
      )

      function endHandler () {
        conn.getObservedAddrs((err, addrs) => {
          expect(err).to.not.exist()
          pull(pull.empty(), conn)
          closeAndAssert(listener, addrs)
        })
      }

      function closeAndAssert (listener, addrs) {
        listener.close(() => {
          expect(addrs[0]).to.deep.equal(ma)
          expect(dialerObsAddrs.length).to.equal(1)
          done()
        })
      }
    })
  })

  it('get Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist()
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.exist()
        expect(peerInfo).to.not.exist()
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      pull(conn, pull.onEnd(endHandler))

      function endHandler () {
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.exist()
          expect(peerInfo).to.not.exist()

          listener.close(done)
        })
      }
    })
  })

  it('set Peer Info', (done) => {
    const listener = tcp.createListener((conn) => {
      expect(conn).to.exist()
      conn.setPeerInfo('batatas')
      conn.getPeerInfo((err, peerInfo) => {
        expect(err).to.not.exist()
        expect(peerInfo).to.equal('batatas')
        pull(pull.empty(), conn)
      })
    })

    listener.listen(ma, () => {
      const conn = tcp.dial(ma)

      pull(conn, pull.onEnd(endHandler))

      function endHandler () {
        conn.setPeerInfo('arroz')
        conn.getPeerInfo((err, peerInfo) => {
          expect(err).to.not.exist()
          expect(peerInfo).to.equal('arroz')

          listener.close(done)
        })
      }
    })
  })
})
