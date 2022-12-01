/* eslint-disable no-console */
// @ts-expect-error types are missing
import forge from 'node-forge/lib/forge.js'
import Benchmark from 'benchmark'
import native from 'ed25519'
import * as noble from '@noble/ed25519'
import 'node-forge/lib/ed25519.js'
import stable from '@stablelib/ed25519'
import supercopWasm from 'supercop.wasm'
import ed25519WasmPro from 'ed25519-wasm-pro'
import * as libp2pCrypto from '../../dist/src/index.js'

const { randomBytes } = noble.utils

const suite = new Benchmark.Suite('ed25519 implementations')

suite.add('@libp2p/crypto', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())

  const key = await libp2pCrypto.keys.generateKeyPair('Ed25519')

  const signature = await key.sign(message)
  const res = await key.public.verify(message, signature)

  if (!res) {
    throw new Error('could not verify @libp2p/crypto signature')
  }

  d.resolve()
}, { defer: true })

suite.add('@noble/ed25519', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const privateKey = noble.utils.randomPrivateKey()
  const publicKey = await noble.getPublicKey(privateKey)
  const signature = await noble.sign(message, privateKey)
  const isSigned = await noble.verify(signature, message, publicKey)

  if (!isSigned) {
    throw new Error('could not verify noble signature')
  }

  d.resolve()
}, { defer: true })

suite.add('@stablelib/ed25519', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const key = stable.generateKeyPair()
  const signature = await stable.sign(key.secretKey, message)
  const isSigned = await stable.verify(key.publicKey, message, signature)

  if (!isSigned) {
    throw new Error('could not verify stablelib signature')
  }

  d.resolve()
}, { defer: true })

suite.add('node-forge/ed25519', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const seed = randomBytes(32)
  const key = await forge.pki.ed25519.generateKeyPair({ seed })
  const signature = await forge.pki.ed25519.sign({ message, privateKey: key.privateKey })
  const res = await forge.pki.ed25519.verify({ signature, message, publicKey: key.publicKey })

  if (!res) {
    throw new Error('could not verify node-forge signature')
  }

  d.resolve()
}, { defer: true })

suite.add('supercop.wasm', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const seed = supercopWasm.createSeed()
  const keys = supercopWasm.createKeyPair(seed)
  const signature = supercopWasm.sign(message, keys.publicKey, keys.secretKey)
  const isSigned = await supercopWasm.verify(signature, message, keys.publicKey)

  if (!isSigned) {
    throw new Error('could not verify supercop.wasm signature')
  }

  d.resolve()
}, { defer: true })

suite.add('ed25519-wasm-pro', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const seed = ed25519WasmPro.createSeed()
  const keys = ed25519WasmPro.createKeyPair(seed)
  const signature = ed25519WasmPro.sign(message, keys.publicKey, keys.secretKey)
  const isSigned = await ed25519WasmPro.verify(signature, message, keys.publicKey)

  if (!isSigned) {
    throw new Error('could not verify ed25519-wasm-pro signature')
  }

  d.resolve()
}, { defer: true })

suite.add('ed25519 (native module)', async (d) => {
  const message = Buffer.from('hello world ' + Math.random())
  const seed = randomBytes(32)
  const key = native.MakeKeypair(seed)
  const signature = native.Sign(message, key)
  const res = native.Verify(message, signature, key.publicKey)

  if (!res) {
    throw new Error('could not verify native signature')
  }

  d.resolve()
}, { defer: true })

async function main () {
  await Promise.all([
    new Promise((resolve) => {
      supercopWasm.ready(() => resolve())
    }),
    new Promise((resolve) => {
      ed25519WasmPro.ready(() => resolve())
    })
  ])
  noble.utils.precompute(8)

  suite
    .on('cycle', (event) => console.log(String(event.target)))
    .on('complete', function () {
      console.log('fastest is ' + this.filter('fastest').map('name'))
    })
    .run({ async: true })
}

main()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
