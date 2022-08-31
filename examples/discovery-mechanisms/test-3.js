import path from 'path'
import { execa } from 'execa'
import pWaitFor from 'p-wait-for'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  const discoveredPeers = []

  process.stdout.write('3.js\n')

  const proc = execa('node', [path.join(__dirname, '3.js')], {
    cwd: path.resolve(__dirname),
    all: true
  })

  proc.all.on('data', async (data) => {
    process.stdout.write(data)
    const str = uint8ArrayToString(data)
    const discoveredPeersRegex = /Peer\s+(?<Peer1>[^\s]+)\s+discovered:\s+(?<Peer2>[^\s]+)/
    str.split('\n').forEach(line => {
      const peers = line.match(discoveredPeersRegex)
      if (peers != null) {
        // sort so we don't count reversed pair twice
        const match = [peers.groups.Peer1, peers.groups.Peer2].sort().join(',')
        if (!discoveredPeers.includes(match)) {
          discoveredPeers.push(match)
        }
      }
    })
  })

  await pWaitFor(() => discoveredPeers.length > 2, 600000)

  proc.kill()
}
