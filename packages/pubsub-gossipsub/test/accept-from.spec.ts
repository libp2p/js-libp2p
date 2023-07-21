import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Registrar } from '@libp2p/interface-internal/registrar'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'ts-sinon'
import { GossipSub } from '../src/index.js'
import { createPeerId } from './utils/index.js'
import { fastMsgIdFn } from './utils/msgId.js'

const peerA = '16Uiu2HAmMkH6ZLen2tbhiuNCTZLLvrZaDgufNdT5MPjtC9Hr9YNA'

describe('Gossipsub acceptFrom', () => {
  let gossipsub: GossipSub
  let sandbox: sinon.SinonSandbox
  let scoreSpy: sinon.SinonSpy<[id: string], number>

  beforeEach(async () => {
    sandbox = sinon.createSandbox()
    // not able to use fake timers or tests in browser are suspended
    // sandbox.useFakeTimers(Date.now())

    const peerId = await createPeerId()
    gossipsub = new GossipSub(
      {
        peerId,
        registrar: stubInterface<Registrar>(),
        peerStore: stubInterface<PeerStore>(),
        connectionManager: stubInterface<ConnectionManager>()
      },
      { emitSelf: false, fastMsgIdFn }
    )

    // stubbing PeerScore causes some pending issue in firefox browser environment
    // we can only spy it
    // using scoreSpy.withArgs("peerA").calledOnce causes the pending issue in firefox
    // while spy.getCall() is fine
    scoreSpy = sandbox.spy(gossipsub.score, 'score')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should only white list peer with positive score', () => {
    // by default the score is 0
    gossipsub.acceptFrom(peerA)
    // 1st time, we have to compute score
    expect(scoreSpy.getCall(0).args[0]).to.be.equal(peerA)
    expect(scoreSpy.getCall(0).returnValue).to.be.equal(0)
    expect(scoreSpy.getCall(1)).to.not.be.ok()
    // 2nd time, use a cached score since it's white listed
    gossipsub.acceptFrom(peerA)
    expect(scoreSpy.getCall(1)).to.not.be.ok()
  })

  it('should recompute score after 1s', async () => {
    // by default the score is 0
    gossipsub.acceptFrom(peerA)
    // 1st time, we have to compute score
    expect(scoreSpy.getCall(0).args[0]).to.be.equal(peerA)
    expect(scoreSpy.getCall(1)).to.not.be.ok()
    gossipsub.acceptFrom(peerA)
    // score is cached
    expect(scoreSpy.getCall(1)).to.not.be.ok()

    // after 1s
    await new Promise((resolve) => setTimeout(resolve, 1001))

    gossipsub.acceptFrom(peerA)
    expect(scoreSpy.getCall(1).args[0]).to.be.equal(peerA)
    expect(scoreSpy.getCall(2)).to.not.be.ok()
  })

  it('should recompute score after max messages accepted', () => {
    // by default the score is 0
    gossipsub.acceptFrom(peerA)
    // 1st time, we have to compute score
    expect(scoreSpy.getCall(0).args[0]).to.be.equal(peerA)
    expect(scoreSpy.getCall(1)).to.not.be.ok()

    for (let i = 0; i < 128; i++) {
      gossipsub.acceptFrom(peerA)
    }
    expect(scoreSpy.getCall(1)).to.not.be.ok()

    // max messages reached
    gossipsub.acceptFrom(peerA)
    expect(scoreSpy.getCall(1).args[0]).to.be.equal(peerA)
    expect(scoreSpy.getCall(2)).to.not.be.ok()
  })

  // TODO: run this in a unit test setup
  // this causes the test to not finish in firefox environment
  // it.skip('should NOT white list peer with negative score', () => {
  //   // peerB is not white listed since score is negative
  //   scoreStub.score.withArgs('peerB').returns(-1)
  //   gossipsub["acceptFrom"]('peerB')
  //   // 1st time, we have to compute score
  //   expect(scoreStub.score.withArgs('peerB').calledOnce).to.be.true()
  //   // 2nd time, still have to compute score since it's NOT white listed
  //   gossipsub["acceptFrom"]('peerB')
  //   expect(scoreStub.score.withArgs('peerB').calledTwice).to.be.true()
  // })
})
