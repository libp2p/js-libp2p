import { once } from 'node:events'
import { getActiveResourcesInfo } from 'node:process'
import { setImmediate } from 'node:timers/promises'
import { parentPort } from 'node:worker_threads'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { stubInterface } from 'sinon-ts'
import { TCP } from '../../src/tcp.ts'
import type { Connection, Upgrader } from '@libp2p/interface'

if (parentPort == null) {
  throw new Error('This fixture must run in a worker')
}

const transport = new TCP({ logger: defaultLogger() })
const upgrader = stubInterface<Upgrader>({
  async upgradeInbound () {},
  async upgradeOutbound () {
    return stubInterface<Connection>()
  }
})
const listener = transport.createListener({ upgrader })

transport.start()

try {
  await listener.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))

  await Promise.all(Array.from({ length: 16 }, async () => {
    await transport.dial(listener.getAddrs()[0], {
      upgrader,
      signal: AbortSignal.timeout(5_000)
    })
  }))
} finally {
  await Promise.all([
    listener.close(),
    transport.stop()
  ])
}

await setImmediate()
parentPort.postMessage(getActiveResourcesInfo().filter(name => name === 'TCPSocketWrap'))

// Keep the worker alive so the parent tests termination, not natural exit.
await once(parentPort, 'message')
