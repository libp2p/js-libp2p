import { contentFetchingTests } from './content-fetching.ts'
import { contentRoutingTests } from './content-routing.ts'
import { peerRoutingTests } from './peer-routing.ts'
import type { DaemonFactory } from '../index.js'

export async function dhtTests (factory: DaemonFactory): Promise<void> {
  contentFetchingTests(factory)
  contentRoutingTests(factory)
  peerRoutingTests(factory)
}
