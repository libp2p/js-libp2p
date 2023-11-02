/**
 * @packageDocumentation
 *
 * The libp2p ecosystem has lots of repos with it comes several problems like:
 *
 * - Domain logic dedupe - all modules shared a lot of logic like validation, streams handling, etc.
 * - Dependencies management - it's really easy with so many repos for dependencies to go out of control, they become outdated, different repos use different modules to do the same thing (like merging defaults options), browser bundles ends up with multiple versions of the same package, bumping versions is cumbersome to do because we need to go through several repos, etc.
 *
 * These problems are the motivation for this package, having shared logic in this package avoids creating cyclic dependencies, centralizes common use modules/functions (exactly like aegir does for the tooling), semantic versioning for 3rd party dependencies is handled in one single place (a good example is going from streams 2 to 3) and maintainers should only care about having `libp2p-utils` updated.
 *
 * @example
 *
 * Each function should be imported directly.
 *
 * ```js
 * import ipAndPortToMultiaddr from '@libp2p/utils/ip-port-to-multiaddr'
 *
 * const ma = ipAndPortToMultiaddr('127.0.0.1', 9000)
 * ```
 */

export {}
