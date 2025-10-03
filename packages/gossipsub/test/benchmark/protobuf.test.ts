import crypto from 'node:crypto'
import { itBench } from '@dapplion/benchmark'
import { RPC } from '../../src/message/rpc.js'

describe('protobuf', function () {
  const testCases: Array<{ name: string, length: number }> = [
    // As of Oct 2023, Attestation length = 281
    { name: 'Attestation', length: 300 },
    // A SignedBeaconBlock could be from 70_000 to 300_000
    { name: 'SignedBeaconBlock', length: 70_000 },
    { name: 'SignedBeaconBlock', length: 140_000 },
    { name: 'SignedBeaconBlock', length: 210_000 },
    { name: 'SignedBeaconBlock', length: 280_000 }
  ]

  for (const { name, length } of testCases) {
    const rpc: RPC = {
      subscriptions: [],
      messages: [
        {
          topic: 'topic1',
          data: crypto.randomBytes(length),
          signature: Uint8Array.from(Array.from({ length: 96 }, () => 100))
        }
      ],
      control: undefined
    }

    const bytes = RPC.encode(rpc)

    const runsFactor = 1000

    itBench({
      id: `decode ${name} message ${length} bytes`,
      fn: () => {
        for (let i = 0; i < runsFactor; i++) {
          RPC.decode(bytes)
        }
      },
      runsFactor
    })

    itBench({
      id: `encode ${name} message ${length} bytes`,
      fn: () => {
        for (let i = 0; i < runsFactor; i++) {
          RPC.encode(rpc)
        }
      },
      runsFactor
    })
  }
})
