/**
 * @packageDocumentation
 *
 * We can't use PeerIds as collection keys because collection keys are compared using same-value-zero equality, so this is just a group of collections that stringifies PeerIds before storing them.
 *
 * PeerIds cache stringified versions of themselves so this should be a cheap operation.
 */

export { PeerMap } from './map.js'
export { PeerSet } from './set.js'
export { PeerList } from './list.js'
