/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import suite from '@libp2p/interface-compliance-tests/connection-encryption'
import { defaultLogger } from '@libp2p/logger'
import { tls } from '@libp2p/tls'
import { stubInterface } from 'sinon-ts'
import { isBrowser, isWebWorker } from 'wherearewe'
import type { StreamMuxerFactory, Upgrader } from '@libp2p/interface'

describe('tls connection encrypter interface compliance', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  suite({
    async setup (opts) {
      return tls()({
        privateKey: opts?.privateKey ?? await generateKeyPair('Ed25519'),
        logger: defaultLogger(),
        upgrader: stubInterface<Upgrader>({
          getStreamMuxers () {
            return new Map([['/test/muxer', stubInterface<StreamMuxerFactory>()]])
          }
        })
      })
    },
    async teardown () {

    }
  })
})
