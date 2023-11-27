// TODO: remove this file and the dep-check override in package.json for
// @libp2p/utils when yamux is updated.
// This is a hack to defeat TypeScript trying to inspect the types for
// @libp2p/utils/abstract-stream which depends on this module - making the
// import path only resolvable at runtime breaks the transpile time circular
// dependency
const s = await import('@libp2p/utils' + '/abstract-stream')

export type AbstractStreamInit = any

export const AbstractStream = s.AbstractStream
