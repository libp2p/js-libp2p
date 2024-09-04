/* eslint-disable @typescript-eslint/no-floating-promises */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { type CreateListenerOptions, transportSymbol, type Metrics } from '@libp2p/interface'
import { mockMetrics, mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { UnimplementedError } from '../src/error.js'
import { WebRTCDirectTransport, type WebRTCDirectTransportComponents } from '../src/private-to-public/transport.js'
import { expectError } from './util.js'

function ignoredDialOption (): CreateListenerOptions {
  const upgrader = mockUpgrader({})
  return { upgrader }
}

describe('WebRTCDirect Transport', () => {
  let metrics: Metrics
  let components: WebRTCDirectTransportComponents

  before(async () => {
    metrics = mockMetrics()()

    const privateKey = await generateKeyPair('Ed25519')

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      privateKey,
      metrics,
      logger: defaultLogger()
    }
  })

  it('can construct', () => {
    const t = new WebRTCDirectTransport(components)
    expect(t.constructor.name).to.equal('WebRTCDirectTransport')
  })

  it('can dial', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    const transport = new WebRTCDirectTransport(components)
    const options = ignoredDialOption()

    // don't await as this isn't an e2e test
    transport.dial(ma, options)
  })

  it('createListner throws', () => {
    const t = new WebRTCDirectTransport(components)
    try {
      t.createListener(ignoredDialOption())
      expect('Should have thrown').to.equal('but did not')
    } catch (e) {
      expect(e).to.be.instanceOf(UnimplementedError)
    }
  })

  it('toString property getter', () => {
    const t = new WebRTCDirectTransport(components)
    const s = t[Symbol.toStringTag]
    expect(s).to.equal('@libp2p/webrtc-direct')
  })

  it('symbol property getter', () => {
    const t = new WebRTCDirectTransport(components)
    const s = t[transportSymbol]
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

    const t = new WebRTCDirectTransport(components)

    expect(t.listenFilter([
      ...valid,
      ...invalid
    ])).to.deep.equal(valid)
  })

  it('throws WebRTC transport error when dialing a multiaddr without a PeerId', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const transport = new WebRTCDirectTransport(components)

    try {
      await transport.dial(ma, ignoredDialOption())
    } catch (error: any) {
      const expected = 'WebRTC transport error: There was a problem with the Multiaddr which was passed in: we need to have the remote\'s PeerId'
      expectError(error, expected)
    }
  })
})
