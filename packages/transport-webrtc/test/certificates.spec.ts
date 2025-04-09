/* eslint-disable @typescript-eslint/no-floating-promises */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { keychain } from '@libp2p/keychain'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { anySignal } from 'any-signal'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { stubInterface } from 'sinon-ts'
import { isNode, isElectronMain } from 'wherearewe'
import { CODEC_CERTHASH } from '../src/constants.js'
import { WebRTCDirectTransport } from '../src/private-to-public/transport.js'
import type { WebRTCDirectTransportComponents } from '../src/private-to-public/transport.js'
import type { Upgrader, Listener, Transport } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('WebRTCDirect Transport - certificates', () => {
  let components: WebRTCDirectTransportComponents
  let listener: Listener
  let upgrader: Upgrader
  let transport: Transport

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const datastore = new MemoryDatastore()
    const logger = defaultLogger()

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      logger,
      transportManager: stubInterface<TransportManager>(),
      privateKey,
      upgrader: stubInterface<Upgrader>({
        createInboundAbortSignal: (signal) => {
          return anySignal([
            AbortSignal.timeout(5_000),
            signal
          ])
        }
      }),
      datastore,
      keychain: keychain()({
        datastore,
        logger
      })
    }

    upgrader = stubInterface<Upgrader>()
  })

  afterEach(async () => {
    await listener?.close()
    await stop(transport)
  })

  it('should reuse the same certificate after a restart', async function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const ipv4 = multiaddr('/ip4/127.0.0.1/udp/0')

    transport = new WebRTCDirectTransport(components)
    await start(transport)
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(ipv4)

    const certHashes1 = getCerthashes(listener.getAddrs())
    await listener.close()
    await stop(transport)

    transport = new WebRTCDirectTransport(components)
    await start(transport)
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(ipv4)

    const certHashes2 = getCerthashes(listener.getAddrs())
    await listener.close()
    await stop(transport)

    expect(certHashes1).to.have.lengthOf(1)
    expect(certHashes1).to.have.nested.property('[0]').that.is.a('string')
    expect(certHashes1).to.deep.equal(certHashes2)
  })

  it('should renew certificate that expires while stopped', async function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    const ipv4 = multiaddr('/ip4/127.0.0.1/udp/0')

    transport = new WebRTCDirectTransport(components, {
      certificateLifespan: 500,
      certificateRenewalThreshold: 100
    })
    await start(transport)
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(ipv4)

    const certHashes1 = getCerthashes(listener.getAddrs())

    await listener.close()
    await stop(transport)

    // wait fo the cert to expire
    await delay(1000)

    await start(transport)
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(ipv4)

    const certHashes2 = getCerthashes(listener.getAddrs())

    await listener.close()
    await stop(transport)

    expect(certHashes1).to.have.lengthOf(1)
    expect(certHashes1).to.have.nested.property('[0]').that.is.a('string')
    expect(certHashes2).to.have.lengthOf(1)
    expect(certHashes2).to.have.nested.property('[0]').that.is.a('string')
    expect(certHashes1).to.not.deep.equal(certHashes2)
  })

  it('should renew certificate before expiry', async function () {
    if (!isNode && !isElectronMain) {
      return this.skip()
    }

    await stop(transport)

    const ipv4 = multiaddr('/ip4/127.0.0.1/udp/0')

    transport = new WebRTCDirectTransport({
      ...components,
      datastore: new MemoryDatastore()
    }, {
      certificateLifespan: 2000,
      certificateRenewalThreshold: 1900
    })
    await start(transport)
    listener = transport.createListener({
      upgrader
    })
    await listener.listen(ipv4)

    const certHashes1 = getCerthashes(listener.getAddrs())

    // wait until the certificate is still valid but we are within the renewal
    // threshold
    await delay(1000)

    const certHashes2 = getCerthashes(listener.getAddrs())

    await listener.close()
    await stop(transport)

    expect(certHashes1).to.have.lengthOf(1)
    expect(certHashes1).to.have.nested.property('[0]').that.is.a('string')
    expect(certHashes2).to.have.lengthOf(1)
    expect(certHashes2).to.have.nested.property('[0]').that.is.a('string')
    expect(certHashes1).to.not.deep.equal(certHashes2)
  })
})

function getCerthashes (addrs: Multiaddr[]): string[] {
  const output: string[] = []

  addrs
    .forEach(ma => {
      ma.stringTuples()
        .forEach(([key, value]) => {
          if (key === CODEC_CERTHASH && value != null) {
            output.push(value)
          }
        })
    })

  return output
}
