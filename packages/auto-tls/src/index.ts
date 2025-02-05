/**
 * @packageDocumentation
 *
 * When a publicly dialable address is detected, use the p2p-forge service at
 * https://registration.libp2p.direct to acquire a valid Let's Encrypt-backed
 * TLS certificate, which the node can then use with the relevant transports.
 *
 * The node must be configured with a listener for at least one of the following
 * transports:
 *
 * * TCP or WS or WSS, (along with the Yamux multiplexer and TLS or Noise encryption)
 * * QUIC-v1
 * * WebTransport
 *
 * It also requires the Identify protocol.
 *
 * @example Use UPnP to hole punch and auto-upgrade to Secure WebSockets
 *
 * ```TypeScript
 * import { noise } from '@chainsafe/libp2p-noise'
 * import { yamux } from '@chainsafe/libp2p-yamux'
 * import { autoTLS } from '@libp2p/auto-tls'
 * import { autoNAT } from '@libp2p/autonat'
 * import { identify } from '@libp2p/identify'
 * import { keychain } from '@libp2p/keychain'
 * import { webSockets } from '@libp2p/websockets'
 * import { uPnPNAT } from '@libp2p/upnp-nat'
 * import { createLibp2p } from 'libp2p'
 *
 * const node = await createLibp2p({
 *   addresses: {
 *     listen: [
 *       '/ip4/0.0.0.0/tcp/0/ws'
 *     ]
 *   },
 *   transports: [
 *     webSockets()
 *   ],
 *   connectionEncrypters: [
 *     noise()
 *   ],
 *   streamMuxers: [
 *     yamux()
 *   ],
 *   services: {
 *     autoNAT: autoNAT(),
 *     autoTLS: autoTLS(),
 *     identify: identify(),
 *     keychain: keychain(),
 *     upnp: uPnPNAT()
 *   }
 * })
 *
 * // ...time passes
 *
 * console.info(node.getMultiaddrs())
 * // includes public WSS address:
 * // [ '/ip4/123.123.123.123/tcp/12345/tls/ws' ]
 * ```
 */

import { AutoTLS as AutoTLSClass } from './auto-tls.js'
import type { PeerId, PrivateKey, ComponentLogger, Libp2pEvents, TypedEventTarget, TLSCertificate, NodeInfo } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Keychain } from '@libp2p/keychain'
import type { Datastore } from 'interface-datastore'

export interface AutoTLSComponents {
  privateKey: PrivateKey
  peerId: PeerId
  logger: ComponentLogger
  addressManager: AddressManager
  events: TypedEventTarget<Libp2pEvents>
  keychain: Keychain
  datastore: Datastore
  nodeInfo: NodeInfo
}

export interface AutoTLSInit {
  /**
   * Where to send requests to answer an ACME DNS challenge on our behalf - note
   * that `/v1/_acme-challenge` will be added to the end of the URL
   *
   * @default 'https://registration.libp2p.direct'
   */
  forgeEndpoint?: string

  /**
   * The top level domain under which we will request certificate for
   *
   * @default 'libp2p.direct'
   */
  forgeDomain?: string

  /**
   * Which ACME service to use - examples are:
   *
   * - https://api.buypass.com/acme/directory
   * - https://dv.acme-v02.api.pki.goog/directory
   * - https://acme-v02.api.letsencrypt.org/directory
   * - https://acme.zerossl.com/v2/DV90
   *
   * @default 'https://acme-v02.api.letsencrypt.org/directory'
   */
  acmeDirectory?: string

  /**
   * How long to attempt to acquire a certificate before timing out in ms
   *
   * @default 120_000
   */
  provisionTimeout?: number

  /**
   * How long asking the forge endpoint to answer a DNS challenge can take
   * before we retry
   *
   * @default 60_000
   */
  provisionRequestTimeout?: number

  /**
   * Certificates are acquired when the `self:peer:update` event fires, which
   * happens when the node's addresses change. To avoid starting to map ports
   * while multiple addresses are being added, the mapping function is debounced
   * by this number of ms
   *
   * @default 5000
   */
  provisionDelay?: number

  /**
   * How long before the expiry of the certificate to renew it in ms, defaults
   * to one day
   *
   * @default 86_400_000
   */
  renewThreshold?: number

  /**
   * The key the certificate is stored in the datastore under
   *
   * @default '/libp2p/auto-tls/certificate'
   */
  certificateDatastoreKey?: string

  /**
   * The name the ACME account RSA private key is stored in the keychain with
   *
   * @default 'auto-tls-acme-account-private-key'
   */
  accountPrivateKeyName?: string

  /**
   * How many bits the RSA private key for the account should be
   *
   * @default 2048
   */
  accountPrivateKeyBits?: number

  /**
   * The name the certificate RSA private key is stored in the keychain with
   *
   * @default 'auto-tls-certificate-private-key'
   */
  certificatePrivateKeyName?: string

  /**
   * How many bits the RSA private key for the certificate should be
   *
   * @default 2048
   */
  certificatePrivateKeyBits?: number

  /**
   * Any mapped addresses are added to the observed address list. These
   * addresses require additional verification by the `@libp2p/autonat` protocol
   * or similar before they are trusted.
   *
   * To skip this verification and trust them immediately pass `true` here
   *
   * @default false
   */
  autoConfirmAddress?: boolean
}

export interface AutoTLS {
  certificate?: TLSCertificate
}

export function autoTLS (init: AutoTLSInit = {}): (components: AutoTLSComponents) => AutoTLS {
  return (components: AutoTLSComponents) => new AutoTLSClass(components, init)
}
