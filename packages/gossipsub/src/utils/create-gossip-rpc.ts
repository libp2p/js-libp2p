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

/**
 * Return a copy of `rpc` carrying the extensions handshake.
 *
 * Deliberately non-mutating: RPC objects are shared across recipients — most
 * notably the single object `publish()` reuses for every peer in `tosend` —
 * so writing the handshake in place would send it to peers that already
 * received one, violating gossipsub v1.3's "MUST NOT be sent more than once".
 *
 * The control arrays are shared with the original rather than cloned; the
 * caller only ever appends the extensions field.
 */
export function withExtensions (rpc: RPC): RPC {
  return {
    ...rpc,
    control: {
      graft: rpc.control?.graft ?? [],
      prune: rpc.control?.prune ?? [],
      ihave: rpc.control?.ihave ?? [],
      iwant: rpc.control?.iwant ?? [],
      idontwant: rpc.control?.idontwant ?? [],
      extensions: { partialMessages: true }
    }
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
