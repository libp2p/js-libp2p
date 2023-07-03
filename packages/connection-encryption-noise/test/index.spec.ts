import { expect } from 'aegir/chai'
import { lpStream } from 'it-length-prefixed-stream'
import { duplexPair } from 'it-pair/duplex'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { noise } from '../src/index.js'
import { Noise } from '../src/noise.js'
import { createPeerIdsFromFixtures } from './fixtures/peer.js'
import type { Metrics } from '@libp2p/interface/metrics'

function createCounterSpy (): ReturnType<typeof sinon.spy> {
  return sinon.spy({
    increment: () => {},
    reset: () => {}
  })
}

describe('Index', () => {
  it('should expose class with tag and required functions', () => {
    const noiseInstance = noise()()
    expect(noiseInstance.protocol).to.equal('/noise')
    expect(typeof (noiseInstance.secureInbound)).to.equal('function')
    expect(typeof (noiseInstance.secureOutbound)).to.equal('function')
  })

  it('should collect metrics', async () => {
    const [localPeer, remotePeer] = await createPeerIdsFromFixtures(2)
    const metricsRegistry = new Map<string, ReturnType<typeof createCounterSpy>>()
    const metrics = {
      registerCounter: (name: string) => {
        const counter = createCounterSpy()
        metricsRegistry.set(name, counter)
        return counter
      }
    }
    const noiseInit = new Noise({ metrics: metrics as any as Metrics })
    const noiseResp = new Noise({})

    const [inboundConnection, outboundConnection] = duplexPair<Uint8Array>()
    const [outbound, inbound] = await Promise.all([
      noiseInit.secureOutbound(localPeer, outboundConnection, remotePeer),
      noiseResp.secureInbound(remotePeer, inboundConnection, localPeer)
    ])
    const wrappedInbound = lpStream(inbound.conn)
    const wrappedOutbound = lpStream(outbound.conn)

    await wrappedOutbound.write(uint8ArrayFromString('test'))
    await wrappedInbound.read()
    expect(metricsRegistry.get('libp2p_noise_xxhandshake_successes_total')?.increment.callCount).to.equal(1)
    expect(metricsRegistry.get('libp2p_noise_xxhandshake_error_total')?.increment.callCount).to.equal(0)
    expect(metricsRegistry.get('libp2p_noise_encrypted_packets_total')?.increment.callCount).to.equal(1)
    expect(metricsRegistry.get('libp2p_noise_decrypt_errors_total')?.increment.callCount).to.equal(0)
  })
})
