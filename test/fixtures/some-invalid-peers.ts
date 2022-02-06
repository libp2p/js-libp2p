const peers: string[] = [
  // @ts-expect-error this is an invalid peer
  null,
  '/ip4/104.236.151.122/tcp/4001/ipfs/malformed-peer-id',
  '/ip4/bad.ip.addr/tcp/4001/ipfs/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
  '/ip4/104.236.151.122/tcp/4001/ipfs/QmSoLju6m7xTh3DuokvT3886QRYqxAzb1kShaanJgW36yx'
]

export default peers
