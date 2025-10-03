import type { RPC } from '../message/rpc.js'

/**
 * Create a gossipsub RPC object
 */
export function createGossipRpc (messages: RPC.Message[] = [], control?: Partial<RPC.ControlMessage>): RPC {
  return {
    subscriptions: [],
    messages,
    control: control !== undefined
      ? {
          graft: control.graft ?? [],
          prune: control.prune ?? [],
          ihave: control.ihave ?? [],
          iwant: control.iwant ?? [],
          idontwant: control.idontwant ?? []
        }
      : undefined
  }
}

export function ensureControl (rpc: RPC): Required<RPC> {
  if (rpc.control === undefined) {
    rpc.control = {
      graft: [],
      prune: [],
      ihave: [],
      iwant: [],
      idontwant: []
    }
  }

  return rpc as Required<RPC>
}
