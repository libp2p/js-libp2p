export function getComponent <T = any> (libp2p: any, name: string): T {
  return libp2p.components[name]
}
