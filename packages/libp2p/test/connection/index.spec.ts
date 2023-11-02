import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { createConnection } from '../../src/connection/index.js'

function defaultConnectionInit (): any {
  return {
    timeline: {
      open: Date.now() - 10,
      upgraded: Date.now()
    },
    direction: 'outbound',
    encryption: '/secio/1.0.0',
    multiplexer: '/mplex/6.7.0',
    status: 'open',
    newStream: Sinon.stub(),
    close: Sinon.stub(),
    abort: Sinon.stub(),
    getStreams: Sinon.stub()
  }
}

describe('connection', () => {
  it('should not require local or remote addrs', async () => {
    const remotePeer = await createEd25519PeerId()

    return createConnection({
      remotePeer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
      ...defaultConnectionInit()
    })
  })

  it('should append remote peer id to address if not already present', async () => {
    const remotePeer = await createEd25519PeerId()

    const conn = createConnection({
      remotePeer,
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4002'),
      ...defaultConnectionInit()
    })

    expect(conn.remoteAddr.getPeerId()).to.equal(remotePeer.toString())
  })

  it('should not append remote peer id to address if present', async () => {
    const remotePeer = await createEd25519PeerId()
    const otherPeer = await createEd25519PeerId()

    const conn = createConnection({
      remotePeer,
      remoteAddr: multiaddr(`/ip4/127.0.0.1/tcp/4002/p2p/${otherPeer}`),
      ...defaultConnectionInit()
    })

    expect(conn.remoteAddr.getPeerId()).to.equal(otherPeer.toString())
  })
})
