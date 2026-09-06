import { generateKeyPair, privateKeyFromProtobuf } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { base64pad } from 'multiformats/bases/base64'
import type { PeerId, PrivateKey } from '@libp2p/interface'

// ed25519 keys
const peers = [{
  id: '12D3KooWH45PiqBjfnEfDfCD6TqJrpqTBJvQDwGHvjGpaWwms46D',
  privKey: 'CAESYBtKXrMwawAARmLScynQUuSwi/gGSkwqDPxi15N3dqDHa4T4iWupkMe5oYGwGH3Hyfvd/QcgSTqg71oYZJadJ6prhPiJa6mQx7mhgbAYfcfJ+939ByBJOqDvWhhklp0nqg==',
  pubKey: 'CAESIGuE+IlrqZDHuaGBsBh9x8n73f0HIEk6oO9aGGSWnSeq'
}, {
  id: '12D3KooWP63uzL78BRMpkQ7augMdNi1h3VBrVWZucKjyhzGVaSi1',
  privKey: 'CAESYPxO3SHyfc2578hDmfkGGBY255JjiLuVavJWy+9ivlpsxSyVKf36ipyRGL6szGzHuFs5ceEuuGVrPMg/rW2Ch1bFLJUp/fqKnJEYvqzMbMe4Wzlx4S64ZWs8yD+tbYKHVg==',
  pubKey: 'CAESIMUslSn9+oqckRi+rMxsx7hbOXHhLrhlazzIP61tgodW'
}, {
  id: '12D3KooWF85R7CM2Wikdtb2sjwnd24e1tgojf3MEWwizmVB8PA6U',
  privKey: 'CAESYNXoQ5CnooE939AEqE2JJGPqvhoFJn0xP+j9KwjfOfDkTtPyfn2kJ1gn3uOYTcmoHFU1bbETNtRVuPMi1fmDmqFO0/J+faQnWCfe45hNyagcVTVtsRM21FW48yLV+YOaoQ==',
  pubKey: 'CAESIE7T8n59pCdYJ97jmE3JqBxVNW2xEzbUVbjzItX5g5qh'
}, {
  id: '12D3KooWPCofiCjhdtezP4eMnqBjjutFZNHjV39F5LWNrCvaLnzT',
  privKey: 'CAESYLhUut01XPu+yIPbtZ3WnxOd26FYuTMRn/BbdFYsZE2KxueKRlo9yIAxmFReoNFUKztUU4G2aUiTbqDQaA6i0MDG54pGWj3IgDGYVF6g0VQrO1RTgbZpSJNuoNBoDqLQwA==',
  pubKey: 'CAESIMbnikZaPciAMZhUXqDRVCs7VFOBtmlIk26g0GgOotDA'
}]

export async function createPeerIdsFromFixtures (length: number): Promise<Array<{ peerId: PeerId, privateKey: PrivateKey }>> {
  return Promise.all(
    Array.from({ length }).map(async (_, i) => {
      const privateKey = privateKeyFromProtobuf(base64pad.decode(`M${peers[i].privKey}`))

      return {
        privateKey,
        peerId: peerIdFromPrivateKey(privateKey)
      }
    })
  )
}

export async function createPeerIds (length: number): Promise<PeerId[]> {
  const peerIds: PeerId[] = []
  for (let i = 0; i < length; i++) {
    const privateKey = await generateKeyPair('Ed25519')
    const id = peerIdFromPrivateKey(privateKey)
    peerIds.push(id)
  }

  return peerIds
}
