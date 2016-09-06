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
    const original = new PeerInfo()
    original.multiaddr.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
      observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer
    })

    pull(
      pull.values([input]),
      lp.encode(),
      p[0]
    )

    identify.dialer(p[1], (err, info, observedAddrs) => {
      expect(err).to.not.exist
      expect(
        info.id.pubKey.bytes
      ).to.be.eql(
        original.id.pubKey.bytes
      )

      expect(
        info.multiaddrs
      ).to.be.eql(
        original.multiaddrs
      )

      expect(
        observedAddrs
      ).to.be.eql(
        [multiaddr('/ip4/127.0.0.1/tcp/5001')]
      )

      done()
    })
  })
})
