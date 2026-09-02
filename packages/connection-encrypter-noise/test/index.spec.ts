import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { lpStream, multiaddrConnectionPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { noise } from '../src/index.js'
import { Noise } from '../src/noise.js'
import type { Metrics, Upgrader } from '@libp2p/interface'

function createCounterSpy (): ReturnType<typeof sinon.spy> {
  return sinon.spy({
    increment: () => {},
    reset: () => {}
  })
}

describe('Index', () => {
  it('should expose class with tag and required functions', async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    const noiseInstance = noise()({
      privateKey,
      peerId,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
    })
    expect(noiseInstance.protocol).to.equal('/noise')
    expect(typeof (noiseInstance.secureInbound)).to.equal('function')
    expect(typeof (noiseInstance.secureOutbound)).to.equal('function')
  })

  it('should collect metrics', async () => {
    const metricsRegistry = new Map<string, ReturnType<typeof createCounterSpy>>()
    const metrics = {
      registerCounter: (name: string) => {
        const counter = createCounterSpy()
        metricsRegistry.set(name, counter)
        return counter
      }
    }

    const privateKeyInit = await generateKeyPair('Ed25519')
    const peerIdInit = peerIdFromPrivateKey(privateKeyInit)
    const noiseInit = new Noise({
      privateKey: privateKeyInit,
      peerId: peerIdInit,
      logger: defaultLogger(),
      metrics: metrics as any as Metrics,
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
    })

    const privateKeyResp = await generateKeyPair('Ed25519')
    const peerIdResp = peerIdFromPrivateKey(privateKeyResp)
    const noiseResp = new Noise({
      privateKey: privateKeyResp,
      peerId: peerIdResp,
      logger: defaultLogger(),
      upgrader: stubInterface<Upgrader>({
        getStreamMuxers: () => new Map()
      })
    })

    const [inboundConnection, outboundConnection] = multiaddrConnectionPair()
    const [outbound, inbound] = await Promise.all([
      noiseInit.secureOutbound(outboundConnection, {
        remotePeer: peerIdResp
      }),
      noiseResp.secureInbound(inboundConnection, {
        remotePeer: peerIdInit
      })
    ])
    const wrappedInbound = lpStream(inbound.connection)
    const wrappedOutbound = lpStream(outbound.connection)

    await wrappedOutbound.write(uint8ArrayFromString('test'))
    await wrappedInbound.read()
    expect(metricsRegistry.get('libp2p_noise_xxhandshake_successes_total')?.increment.callCount).to.equal(1)
    expect(metricsRegistry.get('libp2p_noise_xxhandshake_error_total')?.increment.callCount).to.equal(0)
    expect(metricsRegistry.get('libp2p_noise_encrypted_packets_total')?.increment.callCount).to.equal(1)
    expect(metricsRegistry.get('libp2p_noise_decrypt_errors_total')?.increment.callCount).to.equal(0)
  })
})
