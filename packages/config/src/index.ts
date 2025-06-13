/**
 * @packageDocumentation
 *
 * Utilities to make working with libp2p configuration simpler.
 *
 * @example Load or create the "self" private key in a datastore
 *
 * Most nodes will want to persist the same private key between restarts so this
 * function helps you extract one from a datastore if it exists, otherwise it
 * will create a new one and save it in the keystore.
 *
 * The options you pass to this function should be the same as those passed to
 * the `@libp2p/keychain` service you configure your node with.
 *
 * ```TypeScript
 * import { loadOrCreateSelfKey } from '@libp2p/config'
 * import { keychain } from '@libp2p/keychain'
 * import { LevelDatastore } from 'datastore-level'
 * import { createLibp2p } from 'libp2p'
 *
 * const datastore = new LevelDatastore('/path/to/db')
 * await datastore.open()
 *
 * const keychainInit = {
 *  pass: 'yes-yes-very-secure'
 * }
 *
 * const privateKey = await loadOrCreateSelfKey(datastore, keychainInit)
 *
 * const node = await createLibp2p({
 *   privateKey,
 *   datastore,
 *   services: {
 *     keychain: keychain(keychainInit)
 *   }
 * })
 * ```
 */

export { loadOrCreateSelfKey } from './load-private-key.js'
export type { LoadOrCreateSelfKeyOptions } from './load-private-key.js'
