declare module 'node:quic' {
  export interface QuicAddress {
    address: string
    family: 'ipv4' | 'ipv6'
    port: number
  }

  export interface QuicPath {
    local: QuicAddress
    remote: QuicAddress
  }

  export interface QuicCertificate {
    raw(): Uint8Array
  }

  export interface QuicSessionCloseOptions {
    type: 'application' | 'transport'
    reason?: string
  }

  export interface QuicSession {
    closed: Promise<void>
    opened: Promise<void>
    path?: QuicPath
    peerCertificate: QuicCertificate
    onearlyrejected?: (err: Error) => void
    ongoaway?: (err: Error) => void
    onhandshake?: () => void
    onstream?: (stream: QuicStream) => void
    close(options?: QuicSessionCloseOptions): Promise<void>
    createBidirectionalStream(): Promise<QuicStream>
    destroy(err?: unknown): void
  }

  export interface QuicEndpoint {
    address?: QuicAddress
    closed: Promise<void>
    destroy(): Promise<void>
  }

  export interface ExperimentalQuicStreamWriter extends WritableStreamDefaultWriter<Uint8Array> {
    [key: symbol]: (() => Promise<void>) | undefined
    end(): Promise<void>
    fail(err: Error): void
    writeSync(buf: Uint8Array): void
  }

  export interface QuicStream extends AsyncIterable<Uint8Array[]> {
    writer: ExperimentalQuicStreamWriter
  }

  export interface QuicListenOptions {
    alpn?: string
    endpoint: {
      address: string
    }
    rejectUnauthorized?: boolean
    sni?: Record<string, {
      certs: Uint8Array
      keys: unknown
    }>
    verifyClient?: boolean
  }

  export interface QuicConnectOptions {
    alpn?: string
    certs?: Uint8Array
    keys?: unknown
  }

  export function connect(addr: string, options?: QuicConnectOptions): Promise<QuicSession>
  export function listen(onSession: (session: QuicSession) => void, options: QuicListenOptions): Promise<QuicEndpoint>

  const quic: {
    connect: typeof connect
    listen: typeof listen
  }

  export default quic
}
