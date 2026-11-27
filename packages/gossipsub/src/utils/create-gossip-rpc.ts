import type { RPC } from '../message/rpc.ts'

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

/**
 * True if the RPC carries no subscriptions, messages or control entries
 */
export function isEmptyRpc (rpc: RPC): boolean {
  if (rpc.subscriptions.length > 0 || rpc.messages.length > 0) {
    return false
  }

  const control = rpc.control

  return control == null || (
    control.ihave.length === 0 &&
    control.iwant.length === 0 &&
    control.graft.length === 0 &&
    control.prune.length === 0 &&
    control.idontwant.length === 0
  )
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
