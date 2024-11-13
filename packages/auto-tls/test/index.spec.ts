import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import delay from 'delay'
import { Key, type Datastore } from 'interface-datastore'
import { pEvent } from 'p-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { AutoTLS } from '../src/auto-tls.js'
import { DEFAULT_CERTIFICATE_DATASTORE_KEY, DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME } from '../src/constants.js'
import { importFromPem } from '../src/utils.js'
import { CERT, CERT_FOR_OTHER_KEY, EXPIRED_CERT, INVALID_CERT, PRIVATE_KEY_PEM } from './fixtures/cert.js'
import type { ComponentLogger, Libp2pEvents, Peer, PeerId, PrivateKey, RSAPrivateKey, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Keychain } from '@libp2p/keychain'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedAutoTLSComponents {
  privateKey: PrivateKey
  peerId: PeerId
  logger: ComponentLogger
  addressManager: StubbedInstance<AddressManager>
  events: TypedEventTarget<Libp2pEvents>
  keychain: StubbedInstance<Keychain>
  datastore: Datastore
}

describe('auto-tls', () => {
  let autoTLS: AutoTLS
  let components: StubbedAutoTLSComponents
  let certificateKey: RSAPrivateKey

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    certificateKey = importFromPem(PRIVATE_KEY_PEM)

    components = {
      privateKey,
      peerId: peerIdFromPrivateKey(privateKey),
      logger: defaultLogger(),
      addressManager: stubInterface<AddressManager>(),
      events: new TypedEventEmitter(),
      keychain: stubInterface<Keychain>(),
      datastore: new MemoryDatastore()
    }

    // mixture of LAN and public addresses
    components.addressManager.getAddresses.returns([
      multiaddr(`/ip4/127.0.0.1/tcp/1235/p2p/${components.peerId}`),
      multiaddr(`/ip4/192.168.0.100/tcp/1235/p2p/${components.peerId}`),
      multiaddr(`/ip4/82.32.57.46/tcp/2345/p2p/${components.peerId}`)
    ])
  })

  afterEach(async () => {
    await stop(autoTLS)
  })

  it('should provision a TLS certificate', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().resolves(CERT)

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', true)
  })

  it('should reuse an existing TLS certificate', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().rejects(new Error('Should not have provisioned new certificate'))

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    await components.datastore.put(new Key(DEFAULT_CERTIFICATE_DATASTORE_KEY), uint8ArrayFromString(CERT))

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', false)
  })

  it('should provision a new TLS certificate when the existing one is corrupted', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().resolves(CERT)

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    await components.datastore.put(new Key(DEFAULT_CERTIFICATE_DATASTORE_KEY), uint8ArrayFromString(INVALID_CERT))

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', true)
  })

  it.skip('should provision a new TLS certificate when the existing one has expired', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().resolves(CERT)

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    await components.datastore.put(new Key(DEFAULT_CERTIFICATE_DATASTORE_KEY), uint8ArrayFromString(EXPIRED_CERT))

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', true)
  })

  it('should provision a new TLS certificate when validation fails', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().resolves(CERT)

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    await components.datastore.put(new Key(DEFAULT_CERTIFICATE_DATASTORE_KEY), uint8ArrayFromString(CERT_FOR_OTHER_KEY))

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', true)
  })

  it('should not provision when there are no public addresses', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    // mixture of LAN and public addresses
    components.addressManager.getAddresses.returns([
      multiaddr(`/ip4/127.0.0.1/tcp/1235/p2p/${components.peerId}`),
      multiaddr(`/ip4/192.168.0.100/tcp/1235/p2p/${components.peerId}`)
    ])

    let dispatched = 0

    components.events.addEventListener('certificate:provision', () => {
      dispatched++
    })
    components.events.addEventListener('certificate:renew', () => {
      dispatched++
    })

    await delay(1000)

    expect(dispatched).to.equal(0)
  })

  it('should not provision when there are no supported addresses', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    // mixture of LAN and public addresses
    components.addressManager.getAddresses.returns([
      multiaddr(`/ip4/82.32.57.46/tcp/2345/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN/p2p-circuit/p2p/${components.peerId}`)
    ])

    let dispatched = 0

    components.events.addEventListener('certificate:provision', () => {
      dispatched++
    })
    components.events.addEventListener('certificate:renew', () => {
      dispatched++
    })

    await delay(1000)

    expect(dispatched).to.equal(0)
  })

  it('should remap domain names when the external IP address changes', async () => {
    autoTLS = new AutoTLS(components, {
      provisionDelay: 10
    })
    await start(autoTLS)

    const eventPromise = pEvent(components.events, 'certificate:provision')

    autoTLS.fetchAcmeCertificate = Sinon.stub().resolves(CERT)

    components.keychain.exportKey.withArgs(DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME).resolves(certificateKey)

    await components.datastore.put(new Key(DEFAULT_CERTIFICATE_DATASTORE_KEY), uint8ArrayFromString(CERT_FOR_OTHER_KEY))

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })

    const event = await eventPromise
    expect(event).to.have.nested.property('detail.cert', CERT)
    expect(autoTLS.fetchAcmeCertificate).to.have.property('called', true)

    // a different external address is reported
    components.addressManager.getAddresses.returns([
      multiaddr(`/ip4/127.0.0.1/tcp/1235/p2p/${components.peerId}`),
      multiaddr(`/ip4/192.168.0.100/tcp/1235/p2p/${components.peerId}`),
      multiaddr(`/ip4/64.23.65.25/tcp/2345/p2p/${components.peerId}`)
    ])

    components.events.safeDispatchEvent('self:peer:update', {
      detail: {
        peer: stubInterface<Peer>()
      }
    })
  })
})
