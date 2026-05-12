import { floodsubTests } from './floodsub.ts'
import { gossipsubTests } from './gossipsub.ts'
import { hybridTests } from './hybrid.ts'
import type { DaemonFactory } from '../index.js'

export async function pubsubTests (factory: DaemonFactory): Promise<void> {
  floodsubTests(factory)
  gossipsubTests(factory)
  hybridTests(factory)
}
