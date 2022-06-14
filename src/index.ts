import { topologySymbol as symbol } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Topology, TopologyInit, onConnectHandler, onDisconnectHandler, Registrar } from '@libp2p/interface-registrar'

const noop = () => {}

class TopologyImpl implements Topology {
  public min: number
  public max: number

  /**
   * Set of peers that support the protocol
   */
  public peers: Set<string>
  public onConnect: onConnectHandler
  public onDisconnect: onDisconnectHandler

  protected registrar: Registrar | undefined

  constructor (init: TopologyInit) {
    this.min = init.min ?? 0
    this.max = init.max ?? Infinity
    this.peers = new Set()

    this.onConnect = init.onConnect ?? noop
    this.onDisconnect = init.onDisconnect ?? noop
  }

  get [Symbol.toStringTag] () {
    return symbol.toString()
  }

  get [symbol] () {
    return true
  }

  async setRegistrar (registrar: Registrar) {
    this.registrar = registrar
  }

  /**
   * Notify about peer disconnected event
   */
  disconnect (peerId: PeerId) {
    this.onDisconnect(peerId)
  }
}

export function createTopology (init: TopologyInit): Topology {
  return new TopologyImpl(init)
}
