/* eslint-disable @typescript-eslint/no-floating-promises */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { transportSymbol, type Upgrader, type Listener, type Transport } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import { anySignal } from 'any-signal'
import { stubInterface } from 'sinon-ts'
import { isNode, isElectronMain } from 'wherearewe'
import { WebRTCDirectTransport, type WebRTCDirectTransportComponents } from '../src/private-to-public/transport.js'
import { supportsIpV6 } from './util.js'
import type { TransportManager } from '@libp2p/interface-internal'

function assertAllMultiaddrsHaveSamePort (addrs: Multiaddr[]): void {
  let port: number | undefined

  for (const addr of addrs) {
    const options = addr.toOptions()

    if (port == null) {
      port = options.port
    } else {
      expect(options.port).to.equal(port, 'did not listen on the same port')
    }
  }
}

describe('WebRTCDirect Transport', () => {
  let components: WebRTCDirectTransportComponents
  let listener: Listener
  let upgrader: Upgrader
  let transport: Transport

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      logger: defaultLogger(),
      transportManager: stubInterface<TransportManager>(),
      privateKey,
      upgrader: stubInterface<Upgrader>({
        createInboundAbortSignal: (signal) => {
          return anySignal([
            AbortSignal.timeout(5_000),
            signal
          ])
        }
      })
    }

    upgrader = stubInterface<Upgrader>()
    transport = new WebRTCDirectTransport(components)
    listener = transport.createListener({
      upgrader
    })
  })

  afterEach(async () => {
    await listener?.close()
  })

  it('can construct', () => {
    expect(transport.constructor.name).to.equal('WebRTCDirectTransport')
  })

  it('toString property getter', () => {
    const s = transport[Symbol.toStringTag]
    expect(s).to.equal('@libp2p/webrtc-direct')
  })

  it('symbol property getter', () => {
    const s = transport[transportSymbol]
    expect(s).to.equal(true)
  })

  it('transport filter filters out invalid multiaddrs', async () => {
    const valid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]
    const invalid = [
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ'),
      multiaddr('/ip4/1.2.3.4/tcp/1234/webrtc-direct/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'),
      multiaddr('/ip4/1.2.3.4/udp/1234/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]

    expect(transport.listenFilter([
      ...valid,
      ...invalid
    ])).to.deep.equal(valid)
  })

  it('can listen on ipv4 and ipv6 on the same port in series', async function () {
    if ((!isNode && !isElectronMain) || !supportsIpV6()) {
      return this.skip()
    }

    const ipv4 = multiaddr('/ip4/127.0.0.1/udp/37287')
    const ipv6 = multiaddr('/ip6/::1/udp/37287')

    await listener.listen(ipv4)
    await listener.listen(ipv6)

    assertAllMultiaddrsHaveSamePort(listener.getAddrs())

    await listener.close()
  })

  it('can listen on ipv4 and ipv6 on the same port in parallel', async function () {
    if ((!isNode && !isElectronMain) || !supportsIpV6()) {
      return this.skip()
    }

    const ipv4 = multiaddr('/ip4/127.0.0.1/udp/0')
    const ipv6 = multiaddr('/ip6/::1/udp/0')

    await Promise.all([
      listener.listen(ipv4),
      listener.listen(ipv6)
    ])

    assertAllMultiaddrsHaveSamePort(listener.getAddrs())

    await listener.close()
  })

  it('can listen on wildcard hosts', async function () {
    if ((!isNode && !isElectronMain) || !supportsIpV6()) {
      return this.skip()
    }

    const ipv4 = multiaddr('/ip4/0.0.0.0/udp/0')
    const ipv6 = multiaddr('/ip6/::/udp/0')

    await Promise.all([
      listener.listen(ipv4),
      listener.listen(ipv6)
    ])

    assertAllMultiaddrsHaveSamePort(listener.getAddrs())

    let foundIpv4Loopback = false
    let foundIpv6Loopback = false

    for (const addr of listener.getAddrs()) {
      const options = addr.toOptions()

      if (options.host === '127.0.0.1') {
        foundIpv4Loopback = true
      }

      if (options.host === '::1') {
        foundIpv6Loopback = true
      }
    }

    expect(foundIpv4Loopback).to.be.true('did not listen on ipv4 loopback')
    expect(foundIpv6Loopback).to.be.true('did not listen on ipv6 loopback')

    await listener.close()
  })

  it('can listen on multiple wildcard ports', async function () {
    if ((!isNode && !isElectronMain) || !supportsIpV6()) {
      return this.skip()
    }

    const ipv4a = multiaddr('/ip4/127.0.0.1/udp/0')
    const ipv4b = multiaddr('/ip4/127.0.0.1/udp/0')

    await Promise.all([
      listener.listen(ipv4a),
      listener.listen(ipv4b)
    ])

    const addrs = listener.getAddrs()
    expect(addrs).to.have.lengthOf(2)
    expect(addrs[0].toOptions().port).to.not.equal(addrs[1].toOptions().port, 'wildcard port listeners with the same ip family should not share ports')
  })

  it('should add certificate to announce addresses', async function () {
    if ((!isNode && !isElectronMain) || !supportsIpV6()) {
      return this.skip()
    }

    const announceAddrs = [
      multiaddr('/ip4/80.123.123.43/tcp/12345'),
      multiaddr('/dns/example.com/tcp/12345/wss'),
      multiaddr('/ip4/80.123.123.43/udp/12346/webrtc-direct'),
      multiaddr('/ip6/2a00:23c6:14b1:7e00:ac57:dafd:a294:f01/tcp/12345'),
      multiaddr('/ip6/2a00:23c6:14b1:7e00:ac57:dafd:a294:f01/udp/12346/webrtc-direct'),
      multiaddr('/ip6/2a00:23c6:14b1:7e00:ac57:dafd:a294:f01/udp/12346/webrtc-direct/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN')
    ]

    const ipv4 = multiaddr('/ip4/0.0.0.0/udp/0')
    const ipv6 = multiaddr('/ip6/::/udp/0')

    await Promise.all([
      listener.listen(ipv4),
      listener.listen(ipv6)
    ])

    listener.updateAnnounceAddrs(announceAddrs)

    const webRTCDirectAddrs = announceAddrs.filter(ma => WebRTCDirect.exactMatch(ma))
    expect(webRTCDirectAddrs).to.have.lengthOf(3)

    for (const ma of webRTCDirectAddrs) {
      expect(ma.toString()).to.include('/udp/12346/webrtc-direct/certhash/u', 'did not add certhash to all WebRTC Direct addresses')
    }
  })
})
