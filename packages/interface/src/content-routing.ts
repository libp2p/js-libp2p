import type { RoutingOptions } from './index.js'
import type { PeerInfo } from './peer-info.js'
import type { CID } from 'multiformats/cid'

/**
 * Any object that implements this Symbol as a property should return a
 * ContentRouting instance as the property value, similar to how
 * `Symbol.Iterable` can be used to return an `Iterable` from an `Iterator`.
 *
 * @example
 *
 * ```TypeScript
 * import { contentRoutingSymbol, ContentRouting } from '@libp2p/content-routing'
 *
 * class MyContentRouter implements ContentRouting {
 *   get [contentRoutingSymbol] () {
 *     return this
 *   }
 *
 *   // ...other methods
 * }
 * ```
 */
export const contentRoutingSymbol = Symbol.for('@libp2p/content-routing')

/**
 * Implementers of this interface can provide a ContentRouting implementation to
 * interested callers.
 */
export interface ContentRoutingProvider {
  [contentRoutingSymbol]: ContentRouting
}

export interface ContentRouting {
  /**
   * The implementation of this method should ensure that network peers know the
   * caller can provide content that corresponds to the passed CID.
   *
   * @example
   *
   * ```TypeScript
   * // ...
   * await contentRouting.provide(cid)
   * ```
   */
  provide(cid: CID, options?: RoutingOptions): Promise<void>

  /**
   * If network peers need to be periodically reminded that the caller can
   * provide content corresponding to the passed CID, call this function to no
   * longer remind them.
   */
  cancelReprovide (key: CID, options?: RoutingOptions): Promise<void>

  /**
   * Find the providers of the passed CID.
   *
   * @example
   *
   * ```TypeScript
   * // Iterate over the providers found for the given cid
   * for await (const provider of contentRouting.findProviders(cid)) {
   *  console.log(provider.id, provider.multiaddrs)
   * }
   * ```
   */
  findProviders(cid: CID, options?: RoutingOptions): AsyncIterable<PeerInfo>

  /**
   * Puts a value corresponding to the passed key in a way that can later be
   * retrieved by another network peer using the get method.
   *
   * @example
   *
   * ```TypeScript
   * // ...
   * const key = '/key'
   * const value = uint8ArrayFromString('oh hello there')
   *
   * await contentRouting.put(key, value)
   * ```
   */
  put(key: Uint8Array, value: Uint8Array, options?: RoutingOptions): Promise<void>

  /**
   * Retrieves a value from the network corresponding to the passed key.
   *
   * @example
   *
   * ```TypeScript
   * // ...
   *
   * const key = '/key'
   * const value = await contentRouting.get(key)
   * ```
   */
  get(key: Uint8Array, options?: RoutingOptions): Promise<Uint8Array>
}
