import { floodsubTests } from './floodsub.js'
import { gossipsubTests } from './gossipsub.js'
import { hybridTests } from './hybrid.js'
import type { DaemonFactory } from '../index.js'

export async function pubsubTests (factory: DaemonFactory): Promise<void> {
  floodsubTests(factory)
  gossipsubTests(factory)
  hybridTests(factory)
}
