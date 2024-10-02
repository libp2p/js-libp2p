import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { pipe } from 'it-pipe'
import tests from '../../src/connection/index.js'
import { connectionPair } from '../../src/mocks/connection.js'
import { mockRegistrar } from '../../src/mocks/registrar.js'
import type { Connection } from '@libp2p/interface'

describe('mock connection compliance tests', () => {
  let connections: Connection[] = []

  tests({
    async setup () {
      const privateKeyA = await generateKeyPair('Ed25519')
      const componentsA = {
        peerId: peerIdFromPrivateKey(privateKeyA),
        registrar: mockRegistrar()
      }
      const privateKeyB = await generateKeyPair('Ed25519')
      const componentsB = {
        peerId: peerIdFromPrivateKey(privateKeyB),
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
