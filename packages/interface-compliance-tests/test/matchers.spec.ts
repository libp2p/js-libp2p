import { peerIdFromString } from '@libp2p/peer-id'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { matchMultiaddr, matchPeerId } from '../src/matchers.js'

describe('peer id matcher', () => {
  it('should match the same object', async () => {
    const peerId = await createEd25519PeerId()

    const stub = Sinon.stub()
    stub(peerId)

    expect(stub.calledWith(matchPeerId(peerId))).to.be.true()
  })

  it('should match the same value', async () => {
    const peerId = await createEd25519PeerId()
    const peerId2 = peerIdFromString(peerId.toString())

    const stub = Sinon.stub()
    stub(peerId)

    // this does not match because peerId2 does not contain the private key so
    // the values are not deeply equal
    expect(stub.calledWith(peerId2)).to.be.false()
    expect(stub.calledWith(matchPeerId(peerId2))).to.be.true()
  })
})

describe('multiaddr matcher', () => {
  it('should match the same object', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/4001')

    const stub = Sinon.stub()
    stub(ma)

    expect(stub.calledWith(matchMultiaddr(ma))).to.be.true()
  })

  it('should match the same value', async () => {
    const ma = multiaddr('/ip4/127.0.0.1/tcp/4001')
    const ma2 = multiaddr('/ip4/127.0.0.1/tcp/4001')

    const stub = Sinon.stub()
    stub(ma)

    // this would match because no properties are changed after creation since
    // https://github.com/multiformats/js-multiaddr/pull/330
    // expect(stub.calledWith(ma2)).to.be.false()
    expect(stub.calledWith(matchMultiaddr(ma2))).to.be.true()
  })
})
