import { generateKeyPair, privateKeyToCryptoKeyPair } from '@libp2p/crypto/keys'
import { InvalidParametersError, NotFoundError, NotStartedError, serviceCapabilities, transportSymbol } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { BasicConstraintsExtension, X509Certificate, X509CertificateGenerator } from '@peculiar/x509'
import { Key } from 'interface-datastore'
import { TypedEventEmitter } from 'main-event'
import { base64url } from 'multiformats/bases/base64'
import { sha256 } from 'multiformats/hashes/sha2'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { DEFAULT_CERTIFICATE_DATASTORE_KEY, DEFAULT_CERTIFICATE_LIFESPAN, DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME, DEFAULT_CERTIFICATE_RENEWAL_THRESHOLD } from '../constants.js'
import { genUfrag } from '../util.js'
import { WebRTCDirectListener } from './listener.js'
import { connect } from './utils/connect.js'
import { createDialerRTCPeerConnection } from './utils/get-rtcpeerconnection.js'
import { formatAsPem } from './utils/pem.js'
import type { DataChannelOptions, TransportCertificate } from '../index.js'
import type { WebRTCDialEvents } from '../private-to-private/transport.js'
import type { CreateListenerOptions, Transport, Listener, ComponentLogger, Logger, Connection, CounterGroup, Metrics, PeerId, DialTransportOptions, PrivateKey, Upgrader, Startable } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'
import type { Keychain } from '@libp2p/keychain'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Datastore } from 'interface-datastore'
import type { TypedEventTarget } from 'main-event'

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
   * Number of ms a certificate should be valid for (defaults to 14 days)
   *
   * @default 2_592_000_000
   */
  certificateLifespan?: number

  /**
   * Certificates will be renewed this many ms before expiry (defaults to 1 day)
   *
   * @default 86_400_000
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
  private renewCertificateTask?: ReturnType<typeof setTimeout>

  constructor (components: WebRTCDirectTransportComponents, init: WebRTCTransportDirectInit = {}) {
    this.log = components.logger.forComponent('libp2p:webrtc-direct')
    this.components = components
    this.init = init
    this.emitter = new TypedEventEmitter()

    if (init.certificateLifespan != null && init.certificateRenewalThreshold != null && init.certificateRenewalThreshold >= init.certificateLifespan) {
      throw new InvalidParametersError('Certificate renewal threshold must be less than certificate lifespan')
    }

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
    if (this.renewCertificateTask != null) {
      clearTimeout(this.renewCertificateTask)
    }

    this.certificate = undefined
  }

  /**
   * Dial a given multiaddr
   */
  async dial (ma: Multiaddr, options: DialTransportOptions<WebRTCDialEvents>): Promise<Connection> {
    this.log('dial %a', ma)
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
      return await connect(peerConnection, ufrag, {
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
      })
    } catch (err) {
      peerConnection.close()
      throw err
    }
  }

  /**
   * Create a transport listener - this will throw in browsers
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

  private async getCertificate (forceRenew?: boolean): Promise<TransportCertificate> {
    if (isTransportCertificate(this.init.certificate)) {
      this.log('using provided TLS certificate')
      return this.init.certificate
    }

    const privateKey = await this.loadOrCreatePrivateKey()
    const { pem, certhash } = await this.loadOrCreateCertificate(privateKey, forceRenew)

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

  private async loadOrCreateCertificate (privateKey: PrivateKey, forceRenew?: boolean): Promise<{ pem: string, certhash: string }> {
    if (this.certificate != null && forceRenew !== true) {
      return this.certificate
    }

    let cert: X509Certificate
    const dsKey = new Key(this.init.certificateDatastoreKey ?? DEFAULT_CERTIFICATE_DATASTORE_KEY)
    const keyPair = await privateKeyToCryptoKeyPair(privateKey)

    try {
      if (forceRenew === true) {
        this.log.trace('forcing renewal of TLS certificate')
        throw new NotFoundError()
      }

      this.log.trace('checking for stored TLS certificate')
      cert = await this.loadCertificate(dsKey, keyPair)
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        throw err
      }

      this.log.trace('generating new TLS certificate')
      cert = await this.createCertificate(dsKey, keyPair)
    }

    // set timeout to renew certificate
    let renewTime = (cert.notAfter.getTime() - (this.init.certificateRenewalThreshold ?? DEFAULT_CERTIFICATE_RENEWAL_THRESHOLD)) - Date.now()

    if (renewTime < 0) {
      renewTime = 100
    }

    this.log('will renew TLS certificate after %d ms', renewTime)

    this.renewCertificateTask = setTimeout(() => {
      this.log('renewing TLS certificate')
      this.getCertificate(true)
        .then(cert => {
          this.certificate = cert
          this.emitter.safeDispatchEvent('certificate:renew', {
            detail: cert
          })
        })
        .catch(err => {
          this.log.error('could not renew certificate - %e', err)
        })
    }, renewTime)

    return {
      pem: cert.toString('pem'),
      certhash: base64url.encode((await sha256.digest(new Uint8Array(cert.rawData))).bytes)
    }
  }

  async loadCertificate (dsKey: Key, keyPair: CryptoKeyPair): Promise<X509Certificate> {
    const buf = await this.components.datastore.get(dsKey)
    const cert = new X509Certificate(buf)

    // check expiry date
    const expiryTime = cert.notAfter.getTime() - (this.init.certificateRenewalThreshold ?? DEFAULT_CERTIFICATE_RENEWAL_THRESHOLD)

    if (Date.now() > expiryTime) {
      this.log('stored TLS certificate has expired')
      // act as if no certificate was present
      throw new NotFoundError()
    }

    this.log('loaded certificate, expires in %d ms', expiryTime)

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

    this.log('loaded certificate, expiry time is %o', expiryTime)

    return cert
  }

  async createCertificate (dsKey: Key, keyPair: CryptoKeyPair): Promise<X509Certificate> {
    const notBefore = new Date()
    const notAfter = new Date(Date.now() + (this.init.certificateLifespan ?? DEFAULT_CERTIFICATE_LIFESPAN))

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
