/* eslint-disable no-console */
const crypto = require('../dist/src/index.js')
const peerId = require('../../peer-id/dist/src/index.js')
const Benchmark = require('benchmark')

const variants = ['MLDSA44', 'MLDSA65', 'MLDSA87']

function parseBackends () {
  const raw = process.env.MLDSA_BENCH_BACKENDS ?? 'noble,node-subtle'
  const backends = raw.split(',').map(s => s.trim()).filter(Boolean)

  return backends.length > 0 ? backends : ['noble', 'node-subtle']
}

async function runBackendBenchmarks (backend) {
  const mldsa = await import('../dist/src/keys/mldsa/index.js')
  const { setMLDSABackend, getMLDSABackend } = mldsa

  setMLDSABackend(backend)

  const keys = new Map()
  const verifyFixtures = new Map()
  const suite = new Benchmark.Suite(`mldsa (${backend})`)

  for (const variant of variants) {
    const key = await crypto.keys.generateKeyPair('MLDSA', variant)
    keys.set(variant, key)

    const data = crypto.randomBytes(256)
    const sig = await key.sign(data)
    verifyFixtures.set(variant, {
      data,
      sig
    })
  }

  variants.forEach((variant) => {
    suite.add(`generateKeyPair ${variant}`, async (d) => {
      await crypto.keys.generateKeyPair('MLDSA', variant)
      d.resolve()
    }, {
      defer: true
    })
  })

  variants.forEach((variant) => {
    suite.add(`sign-only ${variant}`, async (d) => {
      const key = keys.get(variant)

      if (key == null) {
        throw new Error(`missing benchmark key for ${variant}`)
      }

      const data = crypto.randomBytes(256)
      const sig = await key.sign(data)

      if (!(sig instanceof Uint8Array) || sig.byteLength === 0) {
        throw new Error(`failed to sign with ${variant}`)
      }

      d.resolve()
    }, {
      defer: true
    })
  })

  variants.forEach((variant) => {
    suite.add(`verify-only ${variant}`, async (d) => {
      const key = keys.get(variant)
      const fixture = verifyFixtures.get(variant)

      if (key == null || fixture == null) {
        throw new Error(`missing benchmark fixtures for ${variant}`)
      }

      const ok = await key.publicKey.verify(fixture.data, fixture.sig)

      if (!ok) {
        throw new Error(`failed to verify ${variant} signature`)
      }

      d.resolve()
    }, {
      defer: true
    })
  })

  variants.forEach((variant) => {
    suite.add(`sign/verify ${variant}`, async (d) => {
      const key = keys.get(variant)

      if (key == null) {
        throw new Error(`missing benchmark key for ${variant}`)
      }

      const data = crypto.randomBytes(256)
      const sig = await key.sign(data)
      const ok = await key.publicKey.verify(data, sig)

      if (!ok) {
        throw new Error(`failed to verify ${variant} signature`)
      }

      d.resolve()
    }, {
      defer: true
    })
  })

  variants.forEach((variant) => {
    suite.add(`peerIdFromPublicKey ${variant}`, (d) => {
      const key = keys.get(variant)

      if (key == null) {
        throw new Error(`missing benchmark key for ${variant}`)
      }

      const id = peerId.peerIdFromPublicKey(key.publicKey)

      if (id.type !== 'MLDSA') {
        throw new Error(`unexpected peer id type for ${variant}: ${id.type}`)
      }

      d.resolve()
    }, {
      defer: true
    })
  })

  console.log(`\n=== MLDSA backend: ${backend} (effective: ${getMLDSABackend()}) ===`)

  await new Promise((resolve) => {
    suite
      .on('cycle', (event) => console.log(String(event.target)))
      .on('error', (event) => {
        console.error('benchmark error:', event.target?.name, event.target?.error)
      })
      .on('complete', function () {
        console.log('fastest is ' + this.filter('fastest').map('name'))
        resolve()
      })
      .run({ async: true })
  })
}

async function run () {
  const backends = parseBackends()

  for (const backend of backends) {
    await runBackendBenchmarks(backend)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
