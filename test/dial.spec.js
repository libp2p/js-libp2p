/* eslint-env mocha */
'use strict'

const pull = require('pull-stream')
const expect = require('chai').expect
const pair = require('pull-pair/duplex')
const PeerInfo = require('peer-info')
const lp = require('pull-length-prefixed')
const multiaddr = require('multiaddr')

const msg = require('../src/message')
const identify = require('../src')

describe('identify.dialer', () => {
  it('works', (done) => {
    const p = pair()
    const info = new PeerInfo()
    info.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    pull(
      p[1],
      lp.decode(),
      pull.collect((err, result) => {
        expect(err).to.not.exist

        const input = msg.decode(result[0])
        expect(
          input
        ).to.be.eql({
          protocolVersion: 'ipfs/0.1.0',
          agentVersion: 'na',
          publicKey: info.id.pubKey.bytes,
          listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
          observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer
        })
        done()
      })
    )

    const conn = p[0]
    conn.getObservedAddrs = (cb) => {
      cb(null, [multiaddr('/ip4/127.0.0.1/tcp/5001')])
    }

    identify.dial(conn, info)
  })
})
