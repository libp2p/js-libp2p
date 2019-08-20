/* eslint-env mocha */
'use strict'

const pull = require('pull-stream/pull')
const collect = require('pull-stream/sinks/collect')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pair = require('pull-pair/duplex')
const PeerInfo = require('peer-info')
const lp = require('pull-length-prefixed')
const multiaddr = require('multiaddr')

const identify = require('../../src/identify')
const msg = identify.message

describe('identify.listener', () => {
  let info

  beforeEach(function (done) {
    this.timeout(20 * 1000)

    PeerInfo.create((err, _info) => {
      if (err) {
        return done(err)
      }

      _info.protocols.add('/echo/1.0.0')
      _info.protocols.add('/chat/1.0.0')

      info = _info
      done()
    })
  })

  it('works', (done) => {
    const p = pair()

    info.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))

    pull(
      p[1],
      lp.decode(),
      collect((err, result) => {
        expect(err).to.not.exist()

        const input = msg.decode(result[0])
        expect(
          input
        ).to.be.eql({
          protocolVersion: 'ipfs/0.1.0',
          agentVersion: 'na',
          publicKey: info.id.pubKey.bytes,
          listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
          observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer,
          protocols: ['/echo/1.0.0', '/chat/1.0.0']
        })
        done()
      })
    )

    const conn = p[0]
    conn.getObservedAddrs = (cb) => {
      cb(null, [multiaddr('/ip4/127.0.0.1/tcp/5001')])
    }

    identify.listener(conn, info)
  })
})
