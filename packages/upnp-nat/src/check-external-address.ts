import { NotStartedError, start, stop } from '@libp2p/interface'
import { repeatingTask } from '@libp2p/utils/repeating-task'
import pDefer from 'p-defer'
import { raceSignal } from 'race-signal'
import type { Gateway } from '@achingbrain/nat-port-mapper'
import type { AbortOptions, ComponentLogger, Logger, Startable } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { RepeatingTask } from '@libp2p/utils/repeating-task'
import type { DeferredPromise } from 'p-defer'

export interface ExternalAddressCheckerComponents {
  gateway: Gateway
  addressManager: AddressManager
  logger: ComponentLogger
}

export interface ExternalAddressCheckerInit {
  interval?: number
  timeout?: number
  onExternalAddressChange?(newExternalAddress: string): void
}

export interface ExternalAddress {
  getPublicIp (options?: AbortOptions): Promise<string> | string
}

/**
 * Monitors the external network address and notifies when/if it changes
 */
class ExternalAddressChecker implements ExternalAddress, Startable {
  private readonly log: Logger
  private readonly gateway: Gateway
  private started: boolean
  private lastPublicIp?: string
  private lastPublicIpPromise?: DeferredPromise<string>
  private readonly check: RepeatingTask
  private readonly onExternalAddressChange?: (newExternalAddress: string) => void

  constructor (components: ExternalAddressCheckerComponents, init: ExternalAddressCheckerInit) {
    this.log = components.logger.forComponent('libp2p:upnp-nat:external-address-check')
    this.gateway = components.gateway
    this.onExternalAddressChange = init.onExternalAddressChange
    this.started = false

    this.checkExternalAddress = this.checkExternalAddress.bind(this)

    this.check = repeatingTask(this.checkExternalAddress, init.interval ?? 30000, {
      timeout: init.timeout ?? 10000,
      runImmediately: true
    })
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    await start(this.check)
    this.started = true
  }

  async stop (): Promise<void> {
    await stop(this.check)
    this.started = false
  }

  /**
   * Return the last public IP address we found, or wait for it to be found
   */
  async getPublicIp (options?: AbortOptions): Promise<string> {
    if (!this.started) {
      throw new NotStartedError('Not started yet')
    }

    if (this.lastPublicIp != null) {
      return this.lastPublicIp
    }

    this.lastPublicIpPromise = pDefer()

    return raceSignal(this.lastPublicIpPromise.promise, options?.signal, {
      errorMessage: 'Requesting the public IP from the network gateway timed out - UPnP may not be enabled'
    })
  }

  private async checkExternalAddress (options?: AbortOptions): Promise<void> {
    try {
      const externalAddress = await this.gateway.externalIp(options)

      // check if our public address has changed
      if (this.lastPublicIp != null && externalAddress !== this.lastPublicIp) {
        this.log('external address changed from %s to %s', this.lastPublicIp, externalAddress)

        // notify listeners that the address has changed
        this.onExternalAddressChange?.(externalAddress)
      }

      this.lastPublicIp = externalAddress
      this.lastPublicIpPromise?.resolve(externalAddress)
    } catch (err: any) {
      this.log.error('could not resolve external address - %e', err)

      if (this.lastPublicIp != null) {
        // ignore the error if we've previously run successfully
        return
      }

      this.lastPublicIpPromise?.reject(err)
    }
  }
}

export function dynamicExternalAddress (components: ExternalAddressCheckerComponents, init: ExternalAddressCheckerInit): ExternalAddress {
  return new ExternalAddressChecker(components, init)
}

export function staticExternalAddress (address: string): ExternalAddress {
  return {
    getPublicIp: () => address
  }
}
