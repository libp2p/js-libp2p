import net from 'net'
import tests from '@libp2p/interface-compliance-tests/transport'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { isNode, isElectron } from 'wherearewe'
import { webRTCDirect } from '../src/index.js'
import { generateTransportCertificate } from '../src/private-to-public/utils/generate-certificates.js'
import type { TransportManager } from '@libp2p/interface-internal'

describe('webrtc-direct interface-transport compliance', () => {
  if (!isNode && !isElectron) {
    return
  }

  tests({
    async setup () {
      const keyPair = await crypto.subtle.generateKey({
        name: 'ECDSA',
        namedCurve: 'P-256'
      }, true, ['sign', 'verify'])
      const listenCertificate = await generateTransportCertificate(keyPair, {
        days: 365
      })
      const listenerPeerId = await createEd25519PeerId()

      const listener = webRTCDirect({
        certificates: [
          listenCertificate
        ]
      })({
        logger: defaultLogger(),
        transportManager: stubInterface<TransportManager>(),
        peerId: listenerPeerId
      })
      const listenAddrs = [
        multiaddr('/ip4/127.0.0.1/udp/9091/webrtc-direct'),
        multiaddr('/ip4/127.0.0.1/udp/9092/webrtc-direct'),
        multiaddr('/ip4/127.0.0.1/udp/9093/webrtc-direct'),
        multiaddr('/ip6/::/udp/9094/webrtc-direct')
      ]

      const dialer = webRTCDirect()({
        logger: defaultLogger(),
        transportManager: stubInterface<TransportManager>(),
        peerId: await createEd25519PeerId()
      })
      const dialAddrs = [
        multiaddr(`/ip4/127.0.0.1/udp/9091/webrtc-direct/certhash/${listenCertificate.certhash}/p2p/${listenerPeerId}`),
        multiaddr(`/ip4/127.0.0.1/udp/9092/webrtc-direct/certhash/${listenCertificate.certhash}/p2p/${listenerPeerId}`),
        multiaddr(`/ip4/127.0.0.1/udp/9093/webrtc-direct/certhash/${listenCertificate.certhash}/p2p/${listenerPeerId}`),
        multiaddr(`/ip6/::/udp/9094/webrtc-direct/certhash/${listenCertificate.certhash}/p2p/${listenerPeerId}`)
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay (delayMs: number) {
          const netConnect = net.connect
          sinon.replace(net, 'connect', (opts: any) => {
            const socket = netConnect(opts)
            const socketEmit = socket.emit.bind(socket)
            sinon.replace(socket, 'emit', (...args: [string]) => {
              const time = args[0] === 'connect' ? delayMs : 0
              setTimeout(() => socketEmit(...args), time)
              return true
            })
            return socket
          })
        },
        restore () {
          sinon.restore()
        }
      }

      return { dialer, listener, listenAddrs, dialAddrs, connector }
    },
    async teardown () {}
  })
})
