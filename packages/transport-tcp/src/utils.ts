import os from 'os'
import path from 'path'
import { InvalidParametersError } from '@libp2p/interface'
import { getNetConfig } from '@libp2p/utils'
import { CODE_UNIX } from '@multiformats/multiaddr'
import { Unix } from '@multiformats/multiaddr-matcher'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ListenOptions, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'

export type NetConfig = ListenOptions | (IpcSocketConnectOpts & TcpSocketConnectOpts)

export function multiaddrToNetConfig (addr: Multiaddr, options: NetConfig = {}): NetConfig {
  if (Unix.exactMatch(addr)) {
    const listenPath = addr.getComponents().find(c => c.code === CODE_UNIX)?.value

    if (listenPath == null) {
      throw new InvalidParametersError(`Multiaddr ${addr} was not a Unix address`)
    }

    // unix socket listening
    if (os.platform() === 'win32') {
      // Use named pipes on Windows systems.
      return { path: path.join('\\\\.\\pipe\\', listenPath) }
    } else {
      return { path: listenPath }
    }
  }

  const config = getNetConfig(addr)
  const host = config.host
  const port = config.port

  // tcp listening
  return {
    host,
    port,
    ipv6Only: config.type === 'ip6',
    ...options
  }
}
