import type { RPC } from '../message/rpc.js'

/**
 * Create a gossipsub RPC object
 */
export function createGossipRpc (messages: RPC.Message[] = [], control?: Partial<RPC.ControlMessage>, partial?: RPC.PartialMessagesExtension): RPC {
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
      : undefined,
    partial
  }
}

export function ensureControl (rpc: RPC): Required<Pick<RPC, 'subscriptions' | 'messages' | 'control'>> & RPC {
  if (rpc.control === undefined) {
    rpc.control = {
      graft: [],
      prune: [],
      ihave: [],
      iwant: [],
      idontwant: []
    }
  }

  return rpc as Required<Pick<RPC, 'subscriptions' | 'messages' | 'control'>> & RPC
}
