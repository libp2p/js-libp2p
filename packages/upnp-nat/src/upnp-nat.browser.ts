import { serviceCapabilities, serviceDependencies } from '@libp2p/interface'
import type { UPnPNATClient, UPnPNAT as UPnPNATInterface } from './index.js'

export class UPnPNAT implements UPnPNATInterface {
  public portMappingClient: UPnPNATClient

  constructor () {
    throw new Error('UPnPNAT is not supported in browsers')
  }

  readonly [Symbol.toStringTag] = '@libp2p/upnp-nat'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/nat-traversal'
  ]

  get [serviceDependencies] (): string[] {
    return []
  }
}
