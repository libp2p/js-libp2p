import { multiaddr } from '@multiformats/multiaddr'
import { validateCircuitRelayServicesConfig } from '../circuit-relay/utils.js'
import { validateIdentifyConfig } from '../identify/config.js'
import type { CircuitRelayServerInit } from '../circuit-relay/server/index.js'
import type { IdentifyServiceInit } from '../identify/index.js'
import type { ServiceMap } from '@libp2p/interface-libp2p'

export const validateMultiaddr = (value: Array<string | undefined> | undefined): boolean => {
  value?.forEach((addr) => {
    try {
      multiaddr(addr)
    } catch (err) {
      throw new Error(`invalid multiaddr: ${addr}`)
    }
  })
  return true
}

export const validateServicesConfig = (opts: ServiceMap): ServiceMap => {
  return {
    identify: validateIdentifyConfig(opts?.identify as IdentifyServiceInit),
    relay: validateCircuitRelayServicesConfig(opts?.relay as CircuitRelayServerInit)
  }
}
