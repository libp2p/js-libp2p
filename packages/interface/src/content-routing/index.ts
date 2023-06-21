import type { AbortOptions } from '../index.js'
import type { PeerInfo } from '../peer-info/index.js'
import type { CID } from 'multiformats/cid'

/**
 * Any object that implements this Symbol as a property should return a
 * ContentRouting instance as the property value, similar to how
 * `Symbol.Iterable` can be used to return an `Iterable` from an `Iterator`.
 *
 * @example
 *
 * ```js
 * import { contentRouting, ContentRouting } from '@libp2p/content-routing'
 *
 * class MyContentRouter implements ContentRouting {
 *   get [contentRouting] () {
 *     return this
 *   }
 *
 *   // ...other methods
 * }
 * ```
 */
export const contentRouting = Symbol.for('@libp2p/content-routing')

export interface ContentRouting {
  /**
   * The implementation of this method should ensure that network peers know the
   * caller can provide content that corresponds to the passed CID.
   *
   * @example
   *
   * ```js
   * // ...
   * await contentRouting.provide(cid)
   * ```
   */
  provide: (cid: CID, options?: AbortOptions) => Promise<void>

  /**
   * Find the providers of the passed CID.
   *
   * @example
   *
   * ```js
   * // Iterate over the providers found for the given cid
   * for await (const provider of contentRouting.findProviders(cid)) {
   *  console.log(provider.id, provider.multiaddrs)
   * }
   * ```
   */
  findProviders: (cid: CID, options?: AbortOptions) => AsyncIterable<PeerInfo>

  /**
   * Puts a value corresponding to the passed key in a way that can later be
   * retrieved by another network peer using the get method.
   *
   * @example
   *
   * ```js
   * // ...
   * const key = '/key'
   * const value = uint8ArrayFromString('oh hello there')
   *
   * await contentRouting.put(key, value)
   * ```
   */
  put: (key: Uint8Array, value: Uint8Array, options?: AbortOptions) => Promise<void>

  /**
   * Retrieves a value from the network corresponding to the passed key.
   *
   * @example
   *
   * ```js
   * // ...
   *
   * const key = '/key'
   * const value = await contentRouting.get(key)
   * ```
   */
  get: (key: Uint8Array, options?: AbortOptions) => Promise<Uint8Array>
}
