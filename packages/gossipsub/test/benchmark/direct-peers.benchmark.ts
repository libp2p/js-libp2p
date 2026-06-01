import { generateKeyPair } from '@libp2p/crypto/keys'
import { stop } from '@libp2p/interface'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { GossipSub as GossipSubClass } from '../../src/gossipsub.ts'
import { gossipsub } from '../../src/index.ts'
import { runBenchmark } from '../utils/benchmark.ts'
import { createComponents, createComponentsArray } from '../utils/create-pubsub.ts'
import { awaitEvents } from '../utils/events.ts'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

const TEST_ADDR = multiaddr('/ip4/127.0.0.1/tcp/9000')

async function makePeers (n: number): Promise<PeerId[]> {
  const keys = await Promise.all(Array.from({ length: n }, () => generateKeyPair('Ed25519')))
  return keys.map(k => peerIdFromPrivateKey(k))
}

// ──────────────────────────────────────────────────────────────────────────────
// BEFORE BASELINE
//
// Before this feature, the only way to add a peer to the direct set was to
// stop gossipsub, reconstruct it with an updated directPeers config, and start
// it again. This function measures that cycle.
// ──────────────────────────────────────────────────────────────────────────────
async function measureLegacyRestartMs (iterations = 5): Promise<number> {
  const node = await createComponents({})
  const peers = await makePeers(iterations)
  let current = node.pubsub

  const start = performance.now()
  for (const peer of peers) {
    // Only way to "add" a direct peer before the new API
    await current.stop()
    const next = gossipsub({ directPeers: [{ id: peer, addrs: [TEST_ADDR] }] })(node.components) as GossipSubClass
    await next.start()
    current = next
  }
  const elapsed = performance.now() - start

  await stop(current, ...Object.entries(node.components))
  return elapsed / iterations
}

// ──────────────────────────────────────────────────────────────────────────────
describe('direct peer management benchmarks', function () {
  this.timeout(300_000)

  // ── 1. BEFORE vs AFTER latency comparison ─────────────────────────────────
  it('BEFORE vs AFTER: cost of changing direct peers at runtime', async () => {
    const addrs: Multiaddr[] = [TEST_ADDR]

    // ── BEFORE: stop + reconstruct + start ─────────────────────
    process.stdout.write('  [before] measuring stop + reconstruct + start cycle…\n')
    const beforeMs = await measureLegacyRestartMs(5)

    // ── AFTER: addDirectPeer ────────────────────────────────────
    process.stdout.write('  [after]  measuring addDirectPeer…\n')
    const node = await createComponents({})
    const peers = await makePeers(20)

    const afterStart = performance.now()
    for (const peer of peers) {
      await node.pubsub.addDirectPeer(peer, addrs)
    }
    const afterMs = (performance.now() - afterStart) / peers.length

    const speedup = beforeMs / afterMs

    process.stdout.write(`\n  ╔═══════════════════════════════════════════════════════╗\n`)
    process.stdout.write(`  ║  BEFORE  stop + reconstruct + start : ${beforeMs.toFixed(1).padStart(8)} ms/op  ║\n`)
    process.stdout.write(`  ║  AFTER   addDirectPeer at runtime   : ${afterMs.toFixed(3).padStart(8)} ms/op  ║\n`)
    process.stdout.write(`  ║  Speedup : ${speedup.toFixed(0)}x faster                                ║\n`)
    process.stdout.write(`  ╚═══════════════════════════════════════════════════════╝\n\n`)

    await stop(node.pubsub, ...Object.entries(node.components))
  })

  // ── 2. addDirectPeer throughput ───────────────────────────────────────────
  it('addDirectPeer', async () => {
    const node = await createComponents({})
    const addrs: Multiaddr[] = [TEST_ADDR]
    // Pre-generate so key generation cost is excluded from the measurement
    const peers = await makePeers(200)
    let i = 0

    await runBenchmark('addDirectPeer', async () => {
      // Cycle through the pre-generated peers; each add merges addrs + Set.add
      await node.pubsub.addDirectPeer(peers[i++ % peers.length], addrs)
    })

    await stop(node.pubsub, ...Object.entries(node.components))
  })

  // ── 3. removeDirectPeer throughput ────────────────────────────────────────
  it('removeDirectPeer', async () => {
    const node = await createComponents({})
    const addrs: Multiaddr[] = [TEST_ADDR]
    const peers = await makePeers(500)

    // Pre-populate the direct set so every remove is a hit
    for (const peer of peers) {
      await node.pubsub.addDirectPeer(peer, addrs)
    }

    let i = 0
    await runBenchmark('removeDirectPeer (hit)', () => {
      node.pubsub.removeDirectPeer(peers[i++ % peers.length])
    })

    await stop(node.pubsub, ...Object.entries(node.components))
  })

  // ── 4. getDirectPeers throughput ──────────────────────────────────────────
  it('getDirectPeers', async () => {
    const node = await createComponents({})
    const addrs: Multiaddr[] = [TEST_ADDR]
    const peers = await makePeers(100)

    for (const peer of peers) {
      await node.pubsub.addDirectPeer(peer, addrs)
    }

    await runBenchmark('getDirectPeers (100-peer set)', () => {
      node.pubsub.getDirectPeers()
    })

    await stop(node.pubsub, ...Object.entries(node.components))
  })

  // ── 5. Connected-node integration benchmark ───────────────────────────────
  // Measures addDirectPeer on a live node with real peers already connected.
  it('addDirectPeer on a running node with connected peers', async () => {
    const nodes = await createComponentsArray({ number: 3, connected: true })
    await Promise.all(nodes.map(async n => awaitEvents(n.pubsub, 'gossipsub:heartbeat', 1)))

    const addrs: Multiaddr[] = [TEST_ADDR]
    const peers = await makePeers(50)
    let i = 0

    await runBenchmark('addDirectPeer (live, connected node)', async () => {
      await nodes[0].pubsub.addDirectPeer(peers[i++ % peers.length], addrs)
    })

    await Promise.allSettled(nodes.map(async n => stop(n.pubsub, ...Object.entries(n.components))))
  })
})
