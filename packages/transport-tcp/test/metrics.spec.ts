import net from 'node:net'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import pWaitFor from 'p-wait-for'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { tcp } from '../src/index.ts'
import type { Listener, Metrics, Upgrader } from '@libp2p/interface'

const INBOUND_CONNECTIONS = 'libp2p_tcp_inbound_connections_total'

type Calculate = () => Record<string, number>

describe('metrics', () => {
  const afterEachCallbacks: Array<() => Promise<any> | any> = []
  let upgrader: Upgrader
  let calculate: Map<string, Calculate>
  let metrics: Metrics

  beforeEach(() => {
    upgrader = stubInterface<Upgrader>({
      upgradeInbound: Sinon.stub().resolves()
    })

    // like `@libp2p/prometheus-metrics`, keep the first group registered under
    // a name and drop the `calculate` function of any later registration
    calculate = new Map()
    metrics = stubInterface<Metrics>()
    ;(metrics.registerMetricGroup as any) = (name: string, opts: { calculate?: Calculate } = {}): any => {
      if (opts.calculate != null && !calculate.has(name)) {
        calculate.set(name, opts.calculate)
      }

      if (opts.calculate == null) {
        return { update: () => {}, increment: () => {} }
      }
    }
    ;(metrics.registerCounterGroup as any) = () => ({ increment: () => {} })
  })

  afterEach(async () => {
    await Promise.all(afterEachCallbacks.map(fn => fn()))
    afterEachCallbacks.length = 0
  })

  async function listen (transport: ReturnType<ReturnType<typeof tcp>>): Promise<{ listener: Listener, address: string }> {
    const listener = transport.createListener({ upgrader })
    afterEachCallbacks.push(async () => listener.close())
    await listener.listen(multiaddr('/ip4/127.0.0.1/tcp/0'))

    const port = listener.getAddrs()[0].toString().split('/').pop()

    return { listener, address: `127.0.0.1:${port}` }
  }

  async function connect (address: string): Promise<net.Socket> {
    const [host, port] = address.split(':')
    const socket = net.connect({ host, port: Number(port) })
    afterEachCallbacks.unshift(() => socket.destroy())

    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve)
      socket.once('error', reject)
    })

    return socket
  }

  it('reports inbound connections of every listener', async () => {
    const transport = tcp()({ logger: defaultLogger(), metrics })
    const first = await listen(transport)
    const second = await listen(transport)

    await connect(first.address)
    await connect(second.address)
    await connect(second.address)

    await pWaitFor(() => {
      const counts = calculate.get(INBOUND_CONNECTIONS)?.() ?? {}
      return counts[first.address] === 1 && counts[second.address] === 2
    }, { timeout: 2000 })

    expect(calculate.get(INBOUND_CONNECTIONS)?.()).to.deep.equal({
      [first.address]: 1,
      [second.address]: 2
    })
  })

  it('stops reporting a listener once it is closed', async () => {
    const transport = tcp()({ logger: defaultLogger(), metrics })
    const first = await listen(transport)
    const second = await listen(transport)

    await connect(second.address)
    await first.listener.close()

    await pWaitFor(() => calculate.get(INBOUND_CONNECTIONS)?.()[second.address] === 1, { timeout: 2000 })

    expect(calculate.get(INBOUND_CONNECTIONS)?.()).to.deep.equal({
      [second.address]: 1
    })
  })
})
