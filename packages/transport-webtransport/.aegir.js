import { execa } from 'execa'
import { path as p2pd } from 'go-libp2p'
import pDefer from 'p-defer'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    async before () {
      const goLibp2p = await createGoLibp2p()

      return {
        goLibp2p,
        env: {
          GO_LIBP2P_ADDR: goLibp2p.multiaddr
        }
      }
    },
    async after (_, before) {
      await before.goLibp2p.proc.kill()
    }
  },
  build: {
    bundlesizeMax: '18kB'
  }
}

async function createGoLibp2p () {
  // dynamic import is necessary because these modules have dependencies on
  // modules in this monorepo which may not have been built yet
  const { multiaddr } = await import('@multiformats/multiaddr')
  const { createClient } = await import('@libp2p/daemon-client')
  const controlPort = Math.floor(Math.random() * (50000 - 10000 + 1)) + 10000
  const apiAddr = multiaddr(`/ip4/127.0.0.1/tcp/${controlPort}`)
  const deferred = pDefer()
  const proc = execa(p2pd(), [
    `-listen=${apiAddr.toString()}`,
    '-hostAddrs=/ip4/127.0.0.1/udp/0/quic-v1/webtransport',
    '-noise=true',
    '-dhtServer',
    '-relay',
    '-muxer=yamux',
    '-echo'
  ], {
    reject: false,
    env: {
      GOLOG_LOG_LEVEL: 'debug'
    }
  })

  proc.stdout?.on('data', (buf) => {
    const str = buf.toString()

    // daemon has started
    if (str.includes('Control socket:')) {
      deferred.resolve()
    }
  })
  await deferred.promise

  const daemonClient = createClient(apiAddr)
  const id = await daemonClient.identify()

  return {
    apiAddr,
    peerId: id.peerId.toString(),
    multiaddr: id.addrs.map(ma => ma.encapsulate(`/p2p/${id.peerId}`).toString()).pop(),
    proc
  }
}
