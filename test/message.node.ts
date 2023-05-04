/* eslint-env mocha */

import fs from 'fs'
import path from 'path'
import { isPeerId } from '@libp2p/interface-peer-id'
import { expect } from 'aegir/chai'
import range from 'lodash.range'
import { Message } from '../src/message/index.js'

describe('Message', () => {
  it('go-interop', () => {
    range(1, 9).forEach((i) => {
      const raw = fs.readFileSync(
        path.join(process.cwd(), 'test', 'fixtures', `msg-${i}`)
      )

      const msg = Message.deserialize(raw)

      expect(msg.clusterLevel).to.gte(0)
      if (msg.record != null) {
        expect(msg.record.key).to.be.a('Uint8Array')
      }

      if (msg.providerPeers.length > 0) {
        msg.providerPeers.forEach((p) => {
          expect(isPeerId(p.id)).to.be.true()
        })
      }
    })
  })
})
