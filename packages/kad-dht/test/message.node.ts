/* eslint-env mocha */

import fs from 'fs'
import path from 'path'
import { isPeerId } from '@libp2p/interface'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import range from 'lodash.range'
import { Message } from '../src/message/dht.js'
import { Libp2pRecord } from '../src/record/index.js'

describe('Message', () => {
  it('go-interop', () => {
    range(1, 9).forEach((i) => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'test', 'fixtures', `msg-${i}`)
      )

      const msg = Message.decode(raw)

      expect(msg.clusterLevel).to.gte(0)
      if (msg.record != null) {
        const record = Libp2pRecord.deserialize(msg.record)

        expect(record.key).to.be.a('Uint8Array')
      }

      if (msg.providers.length > 0) {
        msg.providers.forEach((p) => {
          expect(isPeerId(peerIdFromBytes(p.id))).to.be.true()
        })
      }
    })
  })
})
