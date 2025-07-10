import os from 'os'
import path from 'path'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ListenOptions, IpcSocketConnectOpts, TcpSocketConnectOpts } from 'net'

export type NetConfig = ListenOptions | (IpcSocketConnectOpts & TcpSocketConnectOpts)

export function multiaddrToNetConfig (addr: Multiaddr, config: NetConfig = {}): NetConfig {
  const listenPath = addr.getPath()

  // unix socket listening
  if (listenPath != null) {
    if (os.platform() === 'win32') {
      // Use named pipes on Windows systems.
      return { path: path.join('\\\\.\\pipe\\', listenPath) }
    } else {
      return { path: listenPath }
    }
  }

  const options = addr.toOptions()

  // tcp listening
  return {
    ...config,
    ...options,
    ipv6Only: options.family === 6
  }
}
