import { ClientAuth } from '@libp2p/http-fetch/auth'
import { serviceDependencies, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { isLoopback } from '@libp2p/utils/multiaddr/is-loopback'
import { isPrivate } from '@libp2p/utils/multiaddr/is-private'
import { QUICV1, TCP, WebSockets, WebSocketsSecure, WebTransport } from '@multiformats/multiaddr-matcher'
import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import * as acmeClient from 'acme-client'
import { base36 } from 'multiformats/bases/base36'
import type { AutoTLSComponents, AutoTLSInit, AutoTLS as AutoTLSInterface } from './index.js'
import type { PeerId, PrivateKey, Logger, TypedEventTarget, Libp2pEvents, AbortOptions, TLSCertificate } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { DebouncedFunction } from '@libp2p/utils/debounce'
import type { Multiaddr } from '@multiformats/multiaddr'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

type CertificateEvent = 'certificate:provision' | 'certificate:renew'

export class AutoTLS implements AutoTLSInterface {
  private readonly log: Logger
  private readonly addressManager: AddressManager
  private readonly privateKey: PrivateKey
  private readonly peerId: PeerId
  private readonly events: TypedEventTarget<Libp2pEvents>
  private readonly forgeEndpoint: string
  private readonly forgeDomain: string
  private readonly acmeDirectory: string
  private readonly clientAuth: ClientAuth
  private readonly timeout: number
  private readonly renewThreshold: number
  private started: boolean
  private shutdownController?: AbortController
  public certificate?: TLSCertificate
  private fetching: boolean
  private readonly fetchCertificates: DebouncedFunction
  private renewTimeout?: ReturnType<typeof setTimeout>

  constructor (components: AutoTLSComponents, init: AutoTLSInit = {}) {
    this.log = components.logger.forComponent('libp2p:certificate-manager')
    this.addressManager = components.addressManager
    this.privateKey = components.privateKey
    this.peerId = components.peerId
    this.events = components.events
    this.forgeEndpoint = init.forgeEndpoint ?? 'registration.libp2p.direct'
    this.forgeDomain = init.forgeDomain ?? 'libp2p.direct'
    this.acmeDirectory = init.acmeDirectory ?? 'https://acme-v02.api.letsencrypt.org/directory'
    this.timeout = init.timeout ?? 10000
    this.renewThreshold = init.renewThreshold ?? 60000
    this.clientAuth = new ClientAuth(this.privateKey)
    this.started = false
    this.fetching = false
    this.fetchCertificates = debounce(this._fetchCertificates.bind(this), init.delay ?? 5000)
  }

  get [serviceDependencies] (): string[] {
    return [
      '@libp2p/identify'
    ]
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    this.events.addEventListener('self:peer:update', this.fetchCertificates)
    this.shutdownController = new AbortController()
    this.started = true
  }

  async stop (): Promise<void> {
    this.events.removeEventListener('self:peer:update', this.fetchCertificates)
    this.shutdownController?.abort()
    clearTimeout(this.renewTimeout)
    await stop(this.fetchCertificates)
    this.started = false
  }

  private _fetchCertificates (): void {
    if (this.fetching || this.certificate != null) {
      this.log('already fetching or already have a certificate')
      return
    }

    const addresses = this.addressManager
      .getAddresses()
      .filter(ma => !isPrivate(ma) && !isLoopback(ma) && (
        TCP.exactMatch(ma) ||
        WebSockets.exactMatch(ma) ||
        WebSocketsSecure.exactMatch(ma) ||
        QUICV1.exactMatch(ma) ||
        WebTransport.exactMatch(ma)
      ))

    if (addresses.length === 0) {
      this.log('not fetching certificate as we have no public addresses')
      return
    }

    this.fetching = true

    this.fetchCertificate(addresses, {
      signal: AbortSignal.timeout(this.timeout)
    })
      .catch(err => {
        this.log.error('error fetching certificates %e', err)
      })
      .finally(() => {
        this.fetching = false
      })
  }

  private async fetchCertificate (mulitaddrs: Multiaddr[], options?: AbortOptions): Promise<void> {
    this.log('fetching certificate')

    // TODO: handle rate limit errors like "too many new registrations (10) from this IP address in the last 3h0m0s, retry after 2024-11-01 09:22:38 UTC: see https://letsencrypt.org/docs/rate-limits/#new-registrations-per-ip-address"

    const base36EncodedPeer = base36.encode(this.peerId.toCID().bytes)
    const domain = `${base36EncodedPeer}.${this.forgeDomain}`

    // Create CSR
    const [certificatePrivateKey, csr] = await acmeClient.forge.createCsr({
      commonName: domain,
      altNames: []
    })

    const accountPrivateKey = await acmeClient.forge.createPrivateKey()

    const client = new acmeClient.Client({
      directoryUrl: this.acmeDirectory,
      accountKey: accountPrivateKey
    })
    const certString = await client.auto({
      csr,
      email: `${base36EncodedPeer}@libp2p.direct`,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        const addresses = mulitaddrs.map(ma => ma.toString())

        this.log('asking https://%s/v1/_acme-challenge to respond to the acme DNS challenge on our behalf', this.forgeEndpoint)
        this.log('dialback public addresses: %s', addresses.join(', '))
        const response = await this.clientAuth.authenticatedFetch(`https://${this.forgeEndpoint}/v1/_acme-challenge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            value: keyAuthorization,
            addresses
          }),
          ...options
        })

        if (!response.ok) {
          this.log.error('invalid response from forge %o', response)
          throw new Error('Invalid response status')
        }

        this.log('https://%s/v1/_acme-challenge will respond to the acme DNS challenge on our behalf', this.forgeEndpoint)
      },
      challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
        // no-op
      },
      challengePriority: ['dns-01'],
      skipChallengeVerification: true
    })

    this.log('fetched certificate', certString)

    let event: CertificateEvent = 'certificate:provision'

    if (this.certificate != null) {
      event = 'certificate:renew'
    }

    this.certificate = {
      key: certificatePrivateKey.toString('base64'),
      cert: certString
    }

    // emit an event
    this.events.safeDispatchEvent(event, {
      detail: this.certificate
    })

    const cert = new x509.X509Certificate(certString)

    // schedule renewing the certificate
    this.renewTimeout = setTimeout(() => {
      this.certificate = undefined
      this._fetchCertificates()
    }, cert.notAfter.getTime() - this.renewThreshold)
  }
}
