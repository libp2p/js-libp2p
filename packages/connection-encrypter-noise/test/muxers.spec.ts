import { defaultLogger } from '@libp2p/logger'
import { multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { Noise } from '../src/noise.js'
import { createPeerIdsFromFixtures } from './fixtures/peer.js'
import type { StreamMuxerFactory, Upgrader, SecureConnectionOptions, SecuredConnection, PeerId, PrivateKey } from '@libp2p/interface'
import type { StubbedInstance } from 'sinon-ts'

describe('early muxer selection', () => {
  let initUpgrader: StubbedInstance<Upgrader>
  let respUpgrader: StubbedInstance<Upgrader>
  let remotePeer: { peerId: PeerId, privateKey: PrivateKey }
  let localPeer: { peerId: PeerId, privateKey: PrivateKey }

  beforeEach(async () => {
    [localPeer, remotePeer] = await createPeerIdsFromFixtures(2)

    initUpgrader = stubInterface<Upgrader>()
    respUpgrader = stubInterface<Upgrader>()
  })

  async function testMuxerNegotiation (outboundOpts?: SecureConnectionOptions, inboundOpts?: SecureConnectionOptions): Promise<[SecuredConnection, SecuredConnection]> {
    const noiseInit = new Noise({
      ...localPeer,
      logger: defaultLogger(),
      upgrader: initUpgrader
    })
    const noiseResp = new Noise({
      ...remotePeer,
      logger: defaultLogger(),
      upgrader: respUpgrader
    })

    const [inboundConnection, outboundConnection] = multiaddrConnectionPair()

    return Promise.all([
      noiseInit.secureOutbound(outboundConnection, {
        remotePeer: remotePeer.peerId,
        ...inboundOpts
      }),
      noiseResp.secureInbound(inboundConnection, {
        remotePeer: localPeer.peerId,
        ...outboundOpts
      })
    ])
  }

  it('should negotiate early stream muxer', async () => {
    const commonMuxer = '/common/muxer'

    initUpgrader.getStreamMuxers.returns(new Map([
      ['/other/muxer', stubInterface<StreamMuxerFactory>()],
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })]
    ]))
    respUpgrader.getStreamMuxers.returns(new Map([
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })],
      ['/another/muxer', stubInterface<StreamMuxerFactory>()]
    ]))

    const [securedInbound, securedOutbound] = await testMuxerNegotiation()

    expect(securedInbound).to.have.nested.property('streamMuxer.protocol', commonMuxer)
    expect(securedOutbound).to.have.nested.property('streamMuxer.protocol', commonMuxer)
  })

  it('should fail to negotiate early muxer when there are no common muxers', async () => {
    initUpgrader.getStreamMuxers.returns(new Map([
      ['/other/muxer', stubInterface<StreamMuxerFactory>()],
      ['/yet/other/muxer', stubInterface<StreamMuxerFactory>()]
    ]))
    respUpgrader.getStreamMuxers.returns(new Map([
      ['/another/muxer', stubInterface<StreamMuxerFactory>()],
      ['/yet/another/muxer', stubInterface<StreamMuxerFactory>()]
    ]))

    await expect(testMuxerNegotiation()).to.eventually.be.rejectedWith(/no common muxers/)
  })

  it('should not negotiate early muxer when no muxers are sent', async () => {
    initUpgrader.getStreamMuxers.returns(new Map([]))
    respUpgrader.getStreamMuxers.returns(new Map([]))

    const [securedInbound, securedOutbound] = await testMuxerNegotiation()

    expect(securedInbound).to.have.property('streamMuxer', undefined)
    expect(securedOutbound).to.have.property('streamMuxer', undefined)
  })

  it('should skip selecting stream muxers', async () => {
    const commonMuxer = '/common/muxer'

    initUpgrader.getStreamMuxers.returns(new Map([
      ['/other/muxer', stubInterface<StreamMuxerFactory>()],
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })]
    ]))
    respUpgrader.getStreamMuxers.returns(new Map([
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })],
      ['/another/muxer', stubInterface<StreamMuxerFactory>()]
    ]))

    const [securedInbound, securedOutbound] = await testMuxerNegotiation({
      skipStreamMuxerNegotiation: true
    }, {
      skipStreamMuxerNegotiation: true
    })

    expect(securedInbound).to.have.property('streamMuxer', undefined)
    expect(securedOutbound).to.have.property('streamMuxer', undefined)
  })

  it('should not select muxer if only initiator requires it', async () => {
    const commonMuxer = '/common/muxer'

    initUpgrader.getStreamMuxers.returns(new Map([
      ['/other/muxer', stubInterface<StreamMuxerFactory>()],
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })]
    ]))
    respUpgrader.getStreamMuxers.returns(new Map([
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })],
      ['/another/muxer', stubInterface<StreamMuxerFactory>()]
    ]))

    const [securedInbound, securedOutbound] = await testMuxerNegotiation({
      skipStreamMuxerNegotiation: true
    })

    expect(securedInbound).to.have.property('streamMuxer', undefined)
    expect(securedOutbound).to.have.property('streamMuxer', undefined)
  })

  it('should not select muxer if only responder requires it', async () => {
    const commonMuxer = '/common/muxer'

    initUpgrader.getStreamMuxers.returns(new Map([
      ['/other/muxer', stubInterface<StreamMuxerFactory>()],
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })]
    ]))
    respUpgrader.getStreamMuxers.returns(new Map([
      [commonMuxer, stubInterface<StreamMuxerFactory>({
        protocol: commonMuxer
      })],
      ['/another/muxer', stubInterface<StreamMuxerFactory>()]
    ]))

    const [securedInbound, securedOutbound] = await testMuxerNegotiation({}, {
      skipStreamMuxerNegotiation: true
    })

    expect(securedInbound).to.have.property('streamMuxer', undefined)
    expect(securedOutbound).to.have.property('streamMuxer', undefined)
  })
})
