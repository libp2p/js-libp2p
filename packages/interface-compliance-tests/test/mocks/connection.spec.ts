import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { pipe } from 'it-pipe'
import tests from '../../src/connection/index.js'
import { connectionPair } from '../../src/mocks/connection.js'
import { mockRegistrar } from '../../src/mocks/registrar.js'
import type { Connection } from '@libp2p/interface'

describe('mock connection compliance tests', () => {
  let connections: Connection[] = []

  tests({
    async setup () {
      const componentsA = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }
      const componentsB = {
        peerId: await createEd25519PeerId(),
        registrar: mockRegistrar()
      }
      connections = connectionPair(componentsA, componentsB)

      await componentsB.registrar.handle('/echo/0.0.1', (data) => {
        void pipe(
          data.stream,
          data.stream
        )
      })

      return connections[0]
    },
    async teardown () {
      await Promise.all(connections.map(async conn => {
        await conn.close()
      }))
    }
  })
})
