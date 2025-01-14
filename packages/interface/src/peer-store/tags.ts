/**
 * When a peer that is tagged with this prefix disconnects, we will attempt to
 * redial it, up to a limit.
 *
 * To allow multiple components to add/remove their own keep-alive tags without
 * accidentally overwriting those of other components, attach a unique suffix to
 * the tag, e.g. `keep-alive-circuit-relay` or `keep-alive-kad-dht`, etc.
 */
export const KEEP_ALIVE = 'keep-alive'
