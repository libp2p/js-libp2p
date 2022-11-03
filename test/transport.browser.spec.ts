import * as underTest from '../src/transport.js'
import { UnimplementedError } from '../src/error.js'
import { webRTC } from '../src/index.js'
import { mockUpgrader } from '@libp2p/interface-mocks'
import { CreateListenerOptions, symbol } from '@libp2p/interface-transport'
import { multiaddr, Multiaddr } from '@multiformats/multiaddr'
import { SERVER_MULTIADDR } from './server-multiaddr'
import { noise } from '@chainsafe/libp2p-noise'
import { createLibp2p } from 'libp2p'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'

const { expect, assert } = require('chai').use(require('chai-bytes'))

function ignoredDialOption (): CreateListenerOptions {
  const u = mockUpgrader({})
  return {
    upgrader: u
  }
}

describe('basic transport tests', () => {
  let components: underTest.WebRTCTransportComponents

  before(async () => {
    components = {
      peerId: await createEd25519PeerId()
    }
  })

  it('Can construct', () => {
    const t = new underTest.WebRTCTransport(components)
    expect(t.constructor.name).to.equal('WebRTCTransport')
  })

  it('createListner does throw', () => {
    const t = new underTest.WebRTCTransport(components)
    try {
      t.createListener(ignoredDialOption())
      expect('Should have thrown').to.equal('but did not')
    } catch (e) {
      expect(e).to.be.instanceOf(UnimplementedError)
    }
  })

  it('toString includes the toStringTag', () => {
    const t = new underTest.WebRTCTransport(components)
    const s = t.toString()
    expect(s).to.contain('@libp2p/webrtc')
  })

  it('toString property getter', () => {
    const t = new underTest.WebRTCTransport(components)
    const s = t[Symbol.toStringTag]
    expect(s).to.equal('@libp2p/webrtc')
  })

  it('symbol property getter', () => {
    const t = new underTest.WebRTCTransport(components)
    const s = t[symbol]
    expect(s).to.equal(true)
  })

  it('filter gets rid of some invalids and returns a valid', async () => {
    const mas: Multiaddr[] = [
      '/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ',
      '/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/webrtc/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd',
      '/ip4/1.2.3.4/udp/1234/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd'
    ].map((s) => {
      return multiaddr(s)
    })
    const t = new underTest.WebRTCTransport(components)
    const result = t.filter(mas)
    const expected: Multiaddr[] = [
      multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/12D3KooWGDMwwqrpcYKpKCgxuKT2NfqPqa94QnkoBBpqvCaiCzWd')
    ]
    // expect(result).to.not.be.null();
    assert.isNotNull(result)
    expect(result.constructor.name).to.equal('Array')
    expect(expected.constructor.name).to.equal('Array')
    expect(result).to.eql(expected)
  })

  it('throws appropriate error when dialing someone without a peer ID', async () => {
    const ma = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const t = new underTest.WebRTCTransport(components)
    try {
      const conn = await t.dial(ma, ignoredDialOption())
      expect(conn.toString()).to.equal('Should have thrown')
    } catch (e) {
      expect(e).to.be.instanceOf(Error)
      if (e instanceof Error) {
        // let err: Error = e;
        expect(e.message).to.contain('PeerId')
      }
    }
  })
})

describe('Transport interoperability tests', () => {
  it('can connect to a server', async () => {
    if (SERVER_MULTIADDR) {
      console.log('Will test connecting to', SERVER_MULTIADDR)
    } else {
      console.log('Will not test connecting to an external server, as we do not appear to have one.')
      return
    }
    const node = await createLibp2p({
      transports: [webRTC()],
      connectionEncryption: [noise({})]
    })
    await node.start()
    const ma = multiaddr(SERVER_MULTIADDR)
    const stream = await node.dialProtocol(ma, ['/echo/1.0.0'])
    const data = 'dataToBeEchoedBackToMe\n'
    const response = await pipe([uint8arrayFromString(data)], stream, async (source) => await first(source))
    expect(response?.subarray()).to.equalBytes(uint8arrayFromString(data))
    await node.stop()
  })
})
