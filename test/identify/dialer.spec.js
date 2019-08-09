/* eslint-env mocha */
'use strict'

const pull = require('pull-stream/pull')
const values = require('pull-stream/sources/values')
const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const pair = require('pull-pair/duplex')
const PeerInfo = require('peer-info')
const lp = require('pull-length-prefixed')
const multiaddr = require('multiaddr')

const msg = require('libp2p-identify').message
const identify = require('libp2p-identify')

describe('identify.dialer', () => {
  let original

  before(function (done) {
    this.timeout(20 * 1000)

    PeerInfo.create((err, info) => {
      if (err) {
        return done(err)
      }

      original = info
      done()
    })
  })

  afterEach(() => {
    original.multiaddrs.clear()
    original.protocols.clear()
  })

  it('works', (done) => {
    const p = pair()
    original.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    original.protocols.add('/echo/1.0.0')
    original.protocols.add('/ping/1.0.0')

    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
      observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer,
      protocols: Array.from(original.protocols)
    })

    pull(
      values([input]),
      lp.encode(),
      p[0]
    )

    identify.dialer(p[1], (err, info, observedAddrs) => {
      expect(err).to.not.exist()
      expect(info.id.pubKey.bytes)
        .to.eql(original.id.pubKey.bytes)

      expect(info.multiaddrs.has(original.multiaddrs.toArray()[0]))
        .to.eql(true)

      expect(multiaddr('/ip4/127.0.0.1/tcp/5001').equals(observedAddrs[0]))
        .to.eql(true)

      expect(info.protocols).to.eql(original.protocols)

      done()
    })
  })

  it('should handle missing protocols', (done) => {
    const p = pair()
    original.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))

    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
      observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer,
      protocols: Array.from(original.protocols)
    })

    pull(
      values([input]),
      lp.encode(),
      p[0]
    )

    identify.dialer(p[1], (err, info, observedAddrs) => {
      expect(err).to.not.exist()
      expect(info.id.pubKey.bytes)
        .to.eql(original.id.pubKey.bytes)

      expect(info.multiaddrs.has(original.multiaddrs.toArray()[0]))
        .to.eql(true)

      expect(multiaddr('/ip4/127.0.0.1/tcp/5001').equals(observedAddrs[0]))
        .to.eql(true)

      expect(Array.from(info.protocols)).to.eql([])

      done()
    })
  })

  it('does not crash with invalid listen addresses', (done) => {
    const p = pair()
    original.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [Buffer.from('ffac010203')],
      observedAddr: Buffer.from('ffac010203')
    })

    pull(
      values([input]),
      lp.encode(),
      p[0]
    )

    identify.dialer(p[1], (err, info, observedAddrs) => {
      expect(err).to.exist()

      done()
    })
  })

  it('does not crash with invalid observed address', (done) => {
    const p = pair()
    original.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
      observedAddr: Buffer.from('ffac010203')
    })

    pull(
      values([input]),
      lp.encode(),
      p[0]
    )

    identify.dialer(p[1], (err, info, observedAddrs) => {
      expect(err).to.exist()

      done()
    })
  })

  it('should return an error with mismatched peerInfo data', (done) => {
    const p = pair()
    original.multiaddrs.add(multiaddr('/ip4/127.0.0.1/tcp/5002'))
    const input = msg.encode({
      protocolVersion: 'ipfs/0.1.0',
      agentVersion: 'na',
      publicKey: original.id.pubKey.bytes,
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/5002').buffer],
      observedAddr: multiaddr('/ip4/127.0.0.1/tcp/5001').buffer
    })

    PeerInfo.create((err, info) => {
      if (err) {
        return done(err)
      }

      pull(
        values([input]),
        lp.encode(),
        p[0]
      )

      identify.dialer(p[1], info, (err, peerInfo) => {
        expect(err).to.exist()
        expect(peerInfo).to.not.exist()
        done()
      })
    })
  })
})
