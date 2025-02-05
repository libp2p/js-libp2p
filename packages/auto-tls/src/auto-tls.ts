import { ClientAuth } from '@libp2p/http-fetch/auth'
import { serviceCapabilities, serviceDependencies, setMaxListeners, start, stop } from '@libp2p/interface'
import { debounce } from '@libp2p/utils/debounce'
import { X509Certificate } from '@peculiar/x509'
import * as acme from 'acme-client'
import { anySignal } from 'any-signal'
import delay from 'delay'
import { Key } from 'interface-datastore'
import { base36 } from 'multiformats/bases/base36'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { DEFAULT_ACCOUNT_PRIVATE_KEY_BITS, DEFAULT_ACCOUNT_PRIVATE_KEY_NAME, DEFAULT_ACME_DIRECTORY, DEFAULT_AUTO_CONFIRM_ADDRESS, DEFAULT_CERTIFICATE_DATASTORE_KEY, DEFAULT_CERTIFICATE_PRIVATE_KEY_BITS, DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME, DEFAULT_FORGE_DOMAIN, DEFAULT_FORGE_ENDPOINT, DEFAULT_PROVISION_DELAY, DEFAULT_PROVISION_REQUEST_TIMEOUT, DEFAULT_PROVISION_TIMEOUT, DEFAULT_RENEWAL_THRESHOLD } from './constants.js'
import { DomainMapper } from './domain-mapper.js'
import { createCsr, importFromPem, loadOrCreateKey, supportedAddressesFilter } from './utils.js'
import type { AutoTLSComponents, AutoTLSInit, AutoTLS as AutoTLSInterface } from './index.js'
import type { Logger, AbortOptions } from '@libp2p/interface'
import type { DebouncedFunction } from '@libp2p/utils/debounce'
import type { Multiaddr } from '@multiformats/multiaddr'

const RETRY_DELAY = 5_000

type CertificateEvent = 'certificate:provision' | 'certificate:renew'

interface Certificate {
  key: string
  cert: string
  notAfter: Date
}

export class AutoTLS implements AutoTLSInterface {
  private readonly log: Logger
  private readonly components: AutoTLSComponents
  private readonly forgeEndpoint: URL
  private readonly forgeDomain: string
  private readonly acmeDirectory: URL
  private readonly clientAuth: ClientAuth
  private readonly provisionTimeout: number
  private readonly provisionRequestTimeout: number
  private readonly renewThreshold: number
  private started: boolean
  private shutdownController?: AbortController
  public certificate?: Certificate
  private fetching: boolean
  private readonly onSelfPeerUpdate: DebouncedFunction
  private renewTimeout?: ReturnType<typeof setTimeout>
  private readonly accountPrivateKeyName: string
  private readonly accountPrivateKeyBits: number
  private readonly certificatePrivateKeyName: string
  private readonly certificatePrivateKeyBits: number
  private readonly certificateDatastoreKey: string
  private readonly email
  private readonly domain
  private readonly domainMapper: DomainMapper
  private readonly autoConfirmAddress: boolean

  constructor (components: AutoTLSComponents, init: AutoTLSInit = {}) {
    this.log = components.logger.forComponent('libp2p:auto-tls')
    this.components = components
    this.forgeEndpoint = new URL(init.forgeEndpoint ?? DEFAULT_FORGE_ENDPOINT)
    this.forgeDomain = init.forgeDomain ?? DEFAULT_FORGE_DOMAIN
    this.acmeDirectory = new URL(init.acmeDirectory ?? DEFAULT_ACME_DIRECTORY)
    this.provisionTimeout = init.provisionTimeout ?? DEFAULT_PROVISION_TIMEOUT
    this.provisionRequestTimeout = init.provisionRequestTimeout ?? DEFAULT_PROVISION_REQUEST_TIMEOUT
    this.renewThreshold = init.renewThreshold ?? DEFAULT_RENEWAL_THRESHOLD
    this.accountPrivateKeyName = init.accountPrivateKeyName ?? DEFAULT_ACCOUNT_PRIVATE_KEY_NAME
    this.accountPrivateKeyBits = init.accountPrivateKeyBits ?? DEFAULT_ACCOUNT_PRIVATE_KEY_BITS
    this.certificatePrivateKeyName = init.certificatePrivateKeyName ?? DEFAULT_CERTIFICATE_PRIVATE_KEY_NAME
    this.certificatePrivateKeyBits = init.certificatePrivateKeyBits ?? DEFAULT_CERTIFICATE_PRIVATE_KEY_BITS
    this.certificateDatastoreKey = init.certificateDatastoreKey ?? DEFAULT_CERTIFICATE_DATASTORE_KEY
    this.autoConfirmAddress = init.autoConfirmAddress ?? DEFAULT_AUTO_CONFIRM_ADDRESS
    this.clientAuth = new ClientAuth(this.components.privateKey)
    this.started = false
    this.fetching = false
    this.onSelfPeerUpdate = debounce(this._onSelfPeerUpdate.bind(this), init.provisionDelay ?? DEFAULT_PROVISION_DELAY)

    const base36EncodedPeer = base36.encode(this.components.peerId.toCID().bytes)
    this.domain = `${base36EncodedPeer}.${this.forgeDomain}`
    this.email = `${base36EncodedPeer}@${this.forgeDomain}`
    acme.axios.defaults.headers.common['User-Agent'] = this.components.nodeInfo.userAgent

    this.domainMapper = new DomainMapper(components, {
      ...init,
      domain: this.domain
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/auto-tls'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/auto-tls'
  ]

  get [serviceDependencies] (): string[] {
    const dependencies = [
      '@libp2p/identify',
      '@libp2p/keychain'
    ]

    if (!this.autoConfirmAddress) {
      dependencies.push('@libp2p/autonat')
    }

    return dependencies
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await start(this.domainMapper)
    this.components.events.addEventListener('self:peer:update', this.onSelfPeerUpdate)
    this.shutdownController = new AbortController()
    setMaxListeners(Infinity, this.shutdownController.signal)
    this.started = true
  }

  async stop (): Promise<void> {
    this.components.events.removeEventListener('self:peer:update', this.onSelfPeerUpdate)
    this.shutdownController?.abort()
    clearTimeout(this.renewTimeout)
    await stop(this.onSelfPeerUpdate, this.domainMapper)
    this.started = false
  }

  private _onSelfPeerUpdate (): void {
    const addresses = this.components.addressManager.getAddresses()
      .filter(supportedAddressesFilter)

    if (addresses.length === 0) {
      this.log('not fetching certificate as we have no public addresses')
      return
    }

    if (!this.needsRenewal(this.certificate?.notAfter)) {
      this.log('certificate does not need renewal')
      return
    }

    if (this.fetching) {
      this.log('already fetching')
      return
    }

    this.fetching = true

    Promise.resolve().then(async () => {
      let attempt = 0

      while (true) {
        if (this.shutdownController?.signal.aborted === true) {
          throw this.shutdownController.signal.reason
        }

        try {
          await this.fetchCertificate(addresses, {
            signal: AbortSignal.timeout(this.provisionTimeout)
          })

          return
        } catch (err) {
          this.log.error('provisioning certificate failed on attempt %d - %e', attempt++, err)
        }

        await delay(RETRY_DELAY)
      }
    })
      .catch(err => {
        this.log.error('giving up provisioning certificate - %e', err)
      })
      .finally(() => {
        this.fetching = false
      })
  }

  private async fetchCertificate (multiaddrs: Multiaddr[], options?: AbortOptions): Promise<void> {
    this.log('fetching certificate')

    const certificatePrivateKey = await loadOrCreateKey(this.components.keychain, this.certificatePrivateKeyName, this.certificatePrivateKeyBits)
    const { pem, cert } = await this.loadOrCreateCertificate(certificatePrivateKey, multiaddrs, options)

    let event: CertificateEvent = 'certificate:provision'

    if (this.certificate != null) {
      event = 'certificate:renew'
    }

    this.certificate = {
      key: certificatePrivateKey,
      cert: pem,
      notAfter: cert.notAfter
    }

    const renewAt = new Date(cert.notAfter.getTime() - this.renewThreshold)

    this.log('certificate expiry %s - renewing at %s', cert.notAfter, renewAt)

    // schedule renewing the certificate
    clearTimeout(this.renewTimeout)
    this.renewTimeout = setTimeout(() => {
      Promise.resolve()
        .then(async () => {
          this.certificate = undefined
          this.onSelfPeerUpdate()
        })
        .catch(err => {
          this.log.error('error renewing certificate - %e', err)
        })
    }, Math.min(renewAt.getTime() - Date.now(), Math.pow(2, 31) - 1))

    // emit a certificate event
    this.log('dispatching %s', event)
    this.components.events.safeDispatchEvent(event, {
      detail: {
        ...this.certificate
      }
    })
  }

  private async loadOrCreateCertificate (certificatePrivateKey: string, multiaddrs: Multiaddr[], options?: AbortOptions): Promise<{ pem: string, cert: X509Certificate }> {
    const existingCertificate = await this.loadCertificateIfExists(certificatePrivateKey)

    if (existingCertificate != null) {
      return existingCertificate
    }

    this.log('creating new csr')

    // create CSR
    const csr = await createCsr(`*.${this.domain}`, certificatePrivateKey)

    this.log('fetching new certificate')

    // create cert
    const pem = await this.fetchAcmeCertificate(csr, multiaddrs, options)
    const cert = new X509Certificate(pem)

    // cache cert
    await this.components.datastore.put(new Key(this.certificateDatastoreKey), uint8ArrayFromString(pem))

    return {
      pem,
      cert
    }
  }

  private async loadCertificateIfExists (certificatePrivateKey: string): Promise<{ pem: string, cert: X509Certificate } | undefined> {
    const key = new Key(this.certificateDatastoreKey)

    try {
      this.log.trace('try to load existing certificate')
      const buf = await this.components.datastore.get(key)
      const pem = uint8ArrayToString(buf)
      const cert = new X509Certificate(pem)

      this.log.trace('loaded existing certificate')

      if (this.needsRenewal(cert.notAfter)) {
        this.log('existing certificate requires renewal')
        return
      }

      try {
        const key = importFromPem(certificatePrivateKey)
        const certPublicKeyThumbprint = await cert.publicKey.getThumbprint()
        const keyPublicKeyThumbprint = await crypto.subtle.digest('SHA-1', key.publicKey.raw)

        if (!uint8ArrayEquals(
          new Uint8Array(certPublicKeyThumbprint, 0, certPublicKeyThumbprint.byteLength),
          new Uint8Array(keyPublicKeyThumbprint, 0, keyPublicKeyThumbprint.byteLength)
        )) {
          this.log('certificate public key did not match the expected public key')
          return
        }
      } catch (err: any) {
        this.log.trace('failed to verify existing certificate with stored private key - %e', err)
        return
      }

      return { pem, cert }
    } catch (err: any) {
      this.log.trace('no existing valid certificate found - %e', err)
    }
  }

  async fetchAcmeCertificate (csr: string, multiaddrs: Multiaddr[], options?: AbortOptions): Promise<string> {
    const client = new acme.Client({
      directoryUrl: this.acmeDirectory.toString(),
      accountKey: await loadOrCreateKey(this.components.keychain, this.accountPrivateKeyName, this.accountPrivateKeyBits)
    })

    return client.auto({
      csr,
      email: this.email,
      termsOfServiceAgreed: true,
      challengeCreateFn: async (authz, challenge, keyAuthorization) => {
        const signal = anySignal([this.shutdownController?.signal, options?.signal])
        setMaxListeners(Infinity, signal)

        let attempt = 0

        while (true) {
          if (signal.aborted) {
            throw signal.reason
          }

          try {
            const timeout = AbortSignal.timeout(this.provisionRequestTimeout)
            const signal = anySignal([timeout, options?.signal])
            setMaxListeners(Infinity, timeout, signal)

            await this.configureAcmeChallengeResponse(multiaddrs, keyAuthorization, {
              ...options,
              signal
            })

            return
          } catch (err: any) {
            this.log.error('contacting %s failed on attempt %d - %e', this.forgeEndpoint, attempt++, err.cause ?? err)
          }

          await delay(RETRY_DELAY)
        }
      },
      challengeRemoveFn: async (authz, challenge, keyAuthorization) => {
        // no-op
      },
      challengePriority: ['dns-01'],
      skipChallengeVerification: true
    })
  }

  async configureAcmeChallengeResponse (multiaddrs: Multiaddr[], keyAuthorization: string, options?: AbortOptions): Promise<void> {
    const addresses = multiaddrs.map(ma => ma.toString())

    const endpoint = `${this.forgeEndpoint}v1/_acme-challenge`
    this.log('asking %s to respond to the acme DNS challenge on our behalf', endpoint)
    this.log('dialback public addresses: %s', addresses.join(', '))

    const response = await this.clientAuth.authenticatedFetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': this.components.nodeInfo.userAgent
      },
      body: JSON.stringify({
        Value: keyAuthorization,
        Addresses: addresses
      }),
      ...options
    })

    if (!response.ok) {
      this.log.error('invalid response from forge %o', response)
      throw new Error('Invalid response status')
    }

    this.log('%s will respond to the acme DNS challenge on our behalf', endpoint)
  }

  private needsRenewal (notAfter?: Date): boolean {
    if (notAfter == null) {
      return true
    }

    return notAfter.getTime() - this.renewThreshold < Date.now()
  }
}
