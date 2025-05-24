import { serviceCapabilities, serviceDependencies } from '@libp2p/interface'
import type { PCPNAT as PCPInterface } from './index.js'
import type { PCPNAT } from '@achingbrain/nat-port-mapper'

export class PCP implements PCPInterface {
  public portMappingClient: PCPNAT

  constructor () {
    throw new Error('PCP is not supported in browsers')
  }

  readonly [Symbol.toStringTag] = '@libp2p/pcp-nat'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/nat-traversal'
  ]

  get [serviceDependencies] (): string[] {
    return []
  }
}
