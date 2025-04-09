import { generateKeyPair, privateKeyToCryptoKeyPair } from '@libp2p/crypto/keys'
import { NotFoundError, NotStartedError, TypedEventEmitter, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { BasicConstraintsExtension, X509Certificate, X509CertificateGenerator } from '@peculiar/x509'
import { Key } from 'interface-datastore'
import { base64url } from 'multiformats/bases/base64'
import { sha256 } from 'multiformats/hashes/sha2'
import { raceSignal } from 'race-signal'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { DEFAULT_CERTIFICATE_DATASTORE_KEY, DEFAULT_CERTIFICATE_LIFESPAN, DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME } from '../constants.js'
import { genUfrag } from '../util.js'
import { WebRTCDirectListener } from './listener.js'
import { connect } from './utils/connect.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { formatAsPem } from './utils/pem.js'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { WebRTCDialEvents } from '../private-to-private/transport.js'
import type { CreateListenerOptions, Transport, Listener, ComponentLogger, Logger, Connection, CounterGroup, Metrics, PeerId, DialTransportOptions, PrivateKey, Upgrader, Startable, TypedEventTarget } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Keychain } from '@libp2p/keychain'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'

const ONE_DAY_MS = 86_400_000

export interface WebRTCDirectTransportComponents {
  peerId: PeerId
  privateKey: PrivateKey
  metrics?: Metrics
  logger: ComponentLogger
  transportManager: TransportManager
  upgrader: Upgrader
  keychain?: Keychain
  datastore: Datastore
}

export interface WebRTCMetrics {
  dialerEvents: CounterGroup
}

export interface WebRTCTransportDirectInit {
  /**
   * The default configuration used by all created RTCPeerConnections
   */
  rtcConfiguration?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)

  /**
   * The default configuration used by all created RTCDataChannels
   */
  dataChannel?: DataChannelOptions

  /**
   * @deprecated use `certificate` instead - this option will be removed in a future release
   */
  certificates?: TransportCertificate[]

  /**
   * Use an existing TLS certificate to secure incoming connections or supply
   * settings to generate one.
   *
   * This must be an ECDSA certificate using the P-256 curve.
   *
   * From our testing we find that P-256 elliptic curve is supported by Pion,
   * webrtc-rs, as well as Chromium (P-228 and P-384 was not supported in
   * Chromium).
   */
  certificate?: TransportCertificate

  /**
   * @deprecated this setting is ignored and will be removed in a future release
   */
  useLibjuice?: boolean

  /**
   * The key the certificate is stored in the datastore under
   *
   * @default '/libp2p/webrtc-direct/certificate'
   */
  certificateDatastoreKey?: string

  /**
   * The name the certificate private key is stored in the keychain with
   *
   * @default 'webrtc-direct-certificate-private-key'
   */
  certificateKeychainName?: string

  /**
   * Number of days a certificate should be valid for
   *
   * @default 365
   */
  certificateLifespan?: number

  /**
   * Certificates will be renewed this many days before their expiry
   *
   * @default 5
   */
  certificateRenewalThreshold?: number
}

export interface WebRTCDirectTransportCertificateEvents {
  'certificate:renew': CustomEvent<TransportCertificate>
}

export class WebRTCDirectTransport implements Transport, Startable {
  private readonly log: Logger
  private readonly metrics?: WebRTCMetrics
  private readonly components: WebRTCDirectTransportComponents
  private readonly init: WebRTCTransportDirectInit
  private certificate?: TransportCertificate
  private privateKey?: PrivateKey
  private readonly emitter: TypedEventTarget<WebRTCDirectTransportCertificateEvents>

  constructor (components: WebRTCDirectTransportComponents, init: WebRTCTransportDirectInit = {}) {
    this.log = components.logger.forComponent('libp2p:webrtc-direct')
    this.components = components
    this.init = init
    this.emitter = new TypedEventEmitter()

    if (components.metrics != null) {
      this.metrics = {
        dialerEvents: components.metrics.registerCounterGroup('libp2p_webrtc-direct_dialer_events_total', {
          label: 'event',
          help: 'Total count of WebRTC-direct dial events by type'
        })
      }
    }
  }

  readonly [transportSymbol] = true

  readonly [Symbol.toStringTag] = '@libp2p/webrtc-direct'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/transport'
  ]

  async start (): Promise<void> {
    this.certificate = await this.getCertificate()
  }

  async stop (): Promise<void> {

  }

  /**
   * Dial a given multiaddr
   */
  async dial (ma: Multiaddr, options: DialTransportOptions<WebRTCDialEvents>): Promise<Connection> {
    const rawConn = await this._connect(ma, options)
    this.log('dialing address: %a', ma)
    return rawConn
  }

  /**
   * Create transport listeners no supported by browsers
   */
  createListener (options: CreateListenerOptions): Listener {
    if (this.certificate == null) {
      throw new NotStartedError()
    }

    return new WebRTCDirectListener(this.components, {
      ...this.init,
      ...options,
      certificate: this.certificate,
      emitter: this.emitter
    })
  }

  /**
   * Filter check for all Multiaddrs that this transport can listen on
   */
  listenFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return multiaddrs.filter(WebRTCDirect.exactMatch)
  }

  /**
   * Filter check for all Multiaddrs that this transport can dial
   */
  dialFilter (multiaddrs: Multiaddr[]): Multiaddr[] {
    return this.listenFilter(multiaddrs)
  }

  /**
   * Connect to a peer using a multiaddr
   */
  async _connect (ma: Multiaddr, options: DialTransportOptions<WebRTCDialEvents>): Promise<Connection> {
    // do not create RTCPeerConnection if the signal has already been aborted
    options.signal.throwIfAborted()

    let theirPeerId: PeerId | undefined
    const remotePeerString = ma.getPeerId()
    if (remotePeerString != null) {
      theirPeerId = peerIdFromString(remotePeerString)
    }

    const ufrag = genUfrag()

    // https://github.com/libp2p/specs/blob/master/webrtc/webrtc-direct.md#browser-to-public-server
    const peerConnection = await createDialerRTCPeerConnection('client', ufrag, typeof this.init.rtcConfiguration === 'function' ? await this.init.rtcConfiguration() : this.init.rtcConfiguration ?? {})

    try {
      return await raceSignal(connect(peerConnection, ufrag, {
        role: 'client',
        log: this.log,
        logger: this.components.logger,
        metrics: this.components.metrics,
        events: this.metrics?.dialerEvents,
        signal: options.signal,
        remoteAddr: ma,
        dataChannel: this.init.dataChannel,
        upgrader: options.upgrader,
        peerId: this.components.peerId,
        remotePeerId: theirPeerId,
        privateKey: this.components.privateKey
      }), options.signal)
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  private async getCertificate (): Promise<TransportCertificate> {
    if (isTransportCertificate(this.init.certificate)) {
      this.log.trace('using provided TLS certificate')
      return this.init.certificate
    }

    const privateKey = await this.loadOrCreatePrivateKey()
    const { pem, certhash } = await this.loadOrCreateCertificate(privateKey)

    return {
      privateKey: await formatAsPem(privateKey),
      pem,
      certhash
    }
  }

  private async loadOrCreatePrivateKey (): Promise<PrivateKey> {
    if (this.privateKey != null) {
      return this.privateKey
    }

    const keychainName = this.init.certificateKeychainName ?? DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME
    const keychain = this.getKeychain()

    try {
      if (keychain == null) {
        this.log('no keychain configured - not checking for stored private key')
        throw new NotFoundError()
      }

      this.log.trace('checking for stored private key')
      this.privateKey = await keychain.exportKey(keychainName)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }

      this.log.trace('generating private key')
      this.privateKey = await generateKeyPair('ECDSA', 'P-256')

      if (keychain != null) {
        this.log.trace('storing private key')
        await keychain.importKey(keychainName, this.privateKey)
      } else {
        this.log('no keychain configured - not storing private key')
      }
    }

    return this.privateKey
  }

  private async loadOrCreateCertificate (privateKey: PrivateKey): Promise<{ pem: string, certhash: string }> {
    if (this.certificate != null) {
      return this.certificate
    }

    let cert: X509Certificate
    const dsKey = new Key(this.init.certificateDatastoreKey ?? DEFAULT_CERTIFICATE_DATASTORE_KEY)
    const keyPair = await privateKeyToCryptoKeyPair(privateKey)

    try {
      this.log.trace('checking for stored TLS certificate')
      cert = await this.loadCertificate(dsKey, keyPair)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }

      this.log('generating TLS certificate using private key')
      cert = await this.createCertificate(dsKey, keyPair)
    }

    return {
      pem: cert.toString('pem'),
      certhash: base64url.encode((await sha256.digest(new Uint8Array(cert.rawData))).bytes)
    }
  }

  async loadCertificate (dsKey: Key, keyPair: CryptoKeyPair): Promise<X509Certificate> {
    const buf = await this.components.datastore.get(dsKey)
    const cert = new X509Certificate(buf)

    // check expiry date
    const threshold = Date.now() - ((this.init.certificateLifespan ?? DEFAULT_CERTIFICATE_LIFESPAN) * ONE_DAY_MS)

    if (cert.notAfter.getTime() < threshold) {
      this.log('stored TLS certificate has expired')
      // act as if no certificate was present
      throw new NotFoundError()
    }

    // check public keys match
    const exportedCertKey = await cert.publicKey.export(crypto)
    const rawCertKey = await crypto.subtle.exportKey('raw', exportedCertKey)
    const rawKeyPairKey = await crypto.subtle.exportKey('raw', keyPair.publicKey)

    if (!uint8ArrayEquals(
      new Uint8Array(rawCertKey, 0, rawCertKey.byteLength),
      new Uint8Array(rawKeyPairKey, 0, rawKeyPairKey.byteLength)
    )) {
      this.log('stored TLS certificate public key did not match public key from private key')
      throw new NotFoundError()
    }

    return cert
  }

  async createCertificate (dsKey: Key, keyPair: CryptoKeyPair): Promise<X509Certificate> {
    const notBefore = new Date()
    const notAfter = new Date(notBefore.getTime() + ((this.init.certificateLifespan ?? DEFAULT_CERTIFICATE_LIFESPAN) * ONE_DAY_MS))

    // have to set ms to 0 to work around https://github.com/PeculiarVentures/x509/issues/73
    notBefore.setMilliseconds(0)
    notAfter.setMilliseconds(0)

    const cert = await X509CertificateGenerator.createSelfSigned({
      serialNumber: (BigInt(Math.random().toString().replace('.', '')) * 100000n).toString(16),
      name: 'CN=example.com, C=US, L=CA, O=example, ST=CA',
      notBefore,
      notAfter,
      keys: keyPair,
      extensions: [
        new BasicConstraintsExtension(false, undefined, true)
      ]
    }, crypto)

    if (this.getKeychain() != null) {
      this.log.trace('storing TLS certificate')
      await this.components.datastore.put(dsKey, uint8ArrayFromString(cert.toString('pem')))
    } else {
      this.log('no keychain is configured so not storing TLS certificate since the private key will not be reused')
    }

    return cert
  }

  private getKeychain (): Keychain | undefined {
    try {
      return this.components.keychain
    } catch {}
  }
}

function isTransportCertificate (obj?: any): obj is TransportCertificate {
  if (obj == null) {
    return false
  }

  return typeof obj.privateKey === 'string' && typeof obj.pem === 'string' && typeof obj.certhash === 'string'
}
