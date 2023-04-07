/* eslint-disable @typescript-eslint/no-floating-promises */

import * as underTest from './../src/transport.js'
import { expectError } from './util.js'
import { UnimplementedError } from './../src/error.js'
import { mockUpgrader } from '@libp2p/interface-mocks'
import { CreateListenerOptions, symbol } from '@libp2p/interface-transport'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect, assert } from 'aegir/chai'

function ignoredDialOption (): CreateListenerOptions {
  const upgrader = mockUpgrader({})
  return { upgrader }
}

describe('WebRTC Transport', () => {
  let components: underTest.WebRTCDirectTransportComponents

  before(async () => {
    components = {
      peerId: await createEd25519PeerId()
    }
  })

  it('can construct', () => {
    const t = new underTest.WebRTCDirectTransport(components)
    expect(t.constructor.name).to.equal('WebRTCDirectTransport')
  })

  it('can dial', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    const transport = new underTest.WebRTCDirectTransport(components)
    const options = ignoredDialOption()

    // don't await as this isn't an e2e test
    transport.dial(ma, options)
  })

  it('createListner throws', () => {
    const t = new underTest.WebRTCDirectTransport(components)
    try {
      t.createListener(ignoredDialOption())
      expect('Should have thrown').to.equal('but did not')
    } catch (e) {
      expect(e).to.be.instanceOf(UnimplementedError)
    }
  })

  it('toString property getter', () => {
    const t = new underTest.WebRTCDirectTransport(components)
    const s = t[Symbol.toStringTag]
    expect(s).to.equal('@libp2p/webrtc-direct')
  })

  it('symbol property getter', () => {
    const t = new underTest.WebRTCDirectTransport(components)
    const s = t[symbol]
    expect(s).to.equal(true)
  })

  it('transport filter filters out invalid multiaddrs', async () => {
    const mas: Multiaddr[] = [
      '/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ',
      '/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/webrtc-direct/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'
    ].map((s) => multiaddr(s))
    const t = new underTest.WebRTCDirectTransport(components)
    const result = t.filter(mas)
    const expected =
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')

    assert.isNotNull(result)
    expect(result.constructor.name).to.equal('Array')
    expect(result).to.have.length(1)
    expect(result[0].equals(expected)).to.be.true()
  })

  it('throws WebRTC transport error when dialing a multiaddr without a PeerId', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const transport = new underTest.WebRTCDirectTransport(components)

    try {
      await transport.dial(ma, ignoredDialOption())
    } catch (error) {
      const expected = 'WebRTC transport error: There was a problem with the Multiaddr which was passed in: we need to have the remote\'s PeerId'
      expectError(error, expected)
    }
  })
})
