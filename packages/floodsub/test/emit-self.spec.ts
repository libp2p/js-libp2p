import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { floodsub } from '../src/index.js'
import type { FloodSub } from '../src/index.js'
import type { Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

const topic = 'foo'
const data = uint8ArrayFromString('bar')

describe('emitSelf', () => {
  let pubsub: FloodSub
  let registrar: StubbedInstance<Registrar>

  describe('enabled', () => {
    before(async () => {
      const privateKey = await generateKeyPair('Ed25519')
      const peerId = peerIdFromPrivateKey(privateKey)
      registrar = stubInterface<Registrar>()

      pubsub = floodsub({
        emitSelf: true
      })({
        peerId,
        privateKey,
        registrar,
        logger: defaultLogger()
      })
    })

    before(async () => {
      await start(pubsub)
      pubsub.subscribe(topic)
    })

    after(async () => {
      await stop(pubsub)
    })

    it('should emit to self on publish', async () => {
      pubsub.subscribe(topic)

      const promise = new Promise<void>((resolve) => {
        pubsub.addEventListener('message', (evt) => {
          if (evt.detail.topic === topic) {
            resolve()
          }
        })
      })

      await pubsub.publish(topic, data)

      await promise
    })

    it('should publish a message without data', async () => {
      pubsub.subscribe(topic)

      const promise = new Promise<void>((resolve) => {
        pubsub.addEventListener('message', (evt) => {
          if (evt.detail.topic === topic) {
            resolve()
          }
        })
      })

      await pubsub.publish(topic)

      await promise
    })
  })
})
