/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import createMortice from 'mortice'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { type Message, MessageType } from '../../../src/message/dht.js'
import { Providers } from '../../../src/providers.js'
import { AddProviderHandler } from '../../../src/rpc/handlers/add-provider.js'
import { createPeerIds } from '../../utils/create-peer-id.js'
import { createValues } from '../../utils/create-values.js'
import type { DHTMessageHandler } from '../../../src/rpc/index.js'
import type { PeerId } from '@libp2p/interface'
import type { CID } from 'multiformats'

describe('rpc - handlers - AddProvider', () => {
  let peerIds: PeerId[]
  let values: Array<{ cid: CID, value: Uint8Array }>
  let handler: DHTMessageHandler
  let providers: Providers

  before(async () => {
    [peerIds, values] = await Promise.all([
      createPeerIds(3),
      createValues(2)
    ])
  })

  beforeEach(async () => {
    const datastore = new MemoryDatastore()

    providers = new Providers({
      datastore,
      logger: defaultLogger()
    }, {
      logPrefix: '',
      datastorePrefix: '/dht',
      lock: createMortice()
    })

    handler = new AddProviderHandler({
      logger: defaultLogger()
    }, {
      providers,
      logPrefix: ''
    })
  })

  describe('invalid messages', () => {
    const tests: Array<{ message: Message, error: string }> = [{
      message: {
        type: MessageType.ADD_PROVIDER,
        key: new Uint8Array(0),
        closer: [],
        providers: []
      },
      error: 'InvalidMessageError'
    }, {
      message: {
        type: MessageType.ADD_PROVIDER,
        key: uint8ArrayFromString('hello world'),
        closer: [],
        providers: []
      },
      error: 'InvalidMessageError'
    }]

    tests.forEach((t) => {
      it(t.error.toString(), async () => {
        try {
          await handler.handle(peerIds[0], t.message)
        } catch (err: any) {
          expect(err).to.exist()
          expect(err).to.have.property('name', t.error)
          return
        }
        throw new Error()
      })
    })
  })

  it('ignore providers that do not match the sender', async () => {
    const cid = values[0].cid
    const msg: Message = {
      type: MessageType.ADD_PROVIDER,
      key: cid.bytes,
      closer: [],
      providers: []
    }

    const ma1 = multiaddr('/ip4/127.0.0.1/tcp/1234')
    const ma2 = multiaddr('/ip4/127.0.0.1/tcp/2345')

    msg.providers = [{
      id: peerIds[0].toMultihash().bytes,
      multiaddrs: [ma1.bytes]
    }, {
      id: peerIds[1].toMultihash().bytes,
      multiaddrs: [ma2.bytes]
    }]

    await handler.handle(peerIds[0], msg)

    const provs = await providers.getProviders(cid)
    expect(provs).to.have.length(1)
    expect(provs[0].toString()).to.equal(peerIds[0].toString())
  })
})
