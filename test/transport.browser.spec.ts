import * as underTest from './../src/transport'
import { expectError } from './util'
import { UnimplementedError } from './../src/error'
import { mockUpgrader } from '@libp2p/interface-mocks'
import { CreateListenerOptions, symbol } from '@libp2p/interface-transport'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect, assert } from 'chai'

function ignoredDialOption (): CreateListenerOptions {
  const upgrader = mockUpgrader({})
  return { upgrader }
}

describe('WebRTC Transport', () => {
  let components: underTest.WebRTCTransportComponents

  before(async () => {
    components = {
      peerId: await createEd25519PeerId()
    }
  })

  it('can construct', () => {
    const t = new underTest.WebRTCTransport(components)
    expect(t.constructor.name).to.equal('WebRTCTransport')
  })

  // @TODO(ddimaria): determine if this test has value
  it('createListner does throw', () => {
    const t = new underTest.WebRTCTransport(components)
    try {
      t.createListener(ignoredDialOption())
      expect('Should have thrown').to.equal('but did not')
    } catch (e) {
      expect(e).to.be.instanceOf(UnimplementedError)
    }
  })

  // @TODO(ddimaria): determine if this test has value
  it('toString property getter', () => {
    const t = new underTest.WebRTCTransport(components)
    const s = t[Symbol.toStringTag]
    expect(s).to.equal('@libp2p/webrtc')
  })

  // @TODO(ddimaria): determine if this test has value
  it('symbol property getter', () => {
    const t = new underTest.WebRTCTransport(components)
    const s = t[symbol]
    expect(s).to.equal(true)
  })

  it('transport filter filters out invalid multiaddrs', async () => {
    const mas: Multiaddr[] = [
      '/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ',
      '/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/webrtc/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'
    ].map((s) => multiaddr(s))
    const t = new underTest.WebRTCTransport(components)
    const result = t.filter(mas)
    const expected: Multiaddr[] = [
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]

    assert.isNotNull(result)
    expect(result.constructor.name).to.equal('Array')
    expect(expected.constructor.name).to.equal('Array')
    expect(result).to.eql(expected)
  })

  it('throws WebRTC transport error when dialing a multiaddr without a PeerId', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const transport = new underTest.WebRTCTransport(components)

    try {
      await transport.dial(ma, ignoredDialOption())
    } catch (error) {
      const expected = 'WebRTC transport error: There was a problem with the Multiaddr which was passed in: we need to have the remote\'s PeerId'
      expectError(error, expected)
    }
  })
})
