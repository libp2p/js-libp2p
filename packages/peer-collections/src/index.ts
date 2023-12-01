/**
 * @packageDocumentation
 *
 * We can't use PeerIds as collection keys because collection keys are compared using same-value-zero equality, so this is just a group of collections that stringifies PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this should be a cheap operation.
 *
 * @example Peer lists
 *
 * ```JavaScript
 * import { peerList } from '@libp2p/peer-collections'
 *
 * const list = peerList()
 * list.push(peerId)
 * ```
 *
 * @example Peer maps
 *
 * ```JavaScript
 * import { peerMap } from '@libp2p/peer-collections'
 *
 * const map = peerMap<string>()
 * map.set(peerId, 'value')
 * ```
 *
 * @example Peer sets
 *
 * ```JavaScript
 * import { peerSet } from '@libp2p/peer-collections'
 *
 * const set = peerSet()
 * set.add(peerId)
 * ```
 */

export { PeerMap } from './map.js'
export { PeerSet } from './set.js'
export { PeerList } from './list.js'
