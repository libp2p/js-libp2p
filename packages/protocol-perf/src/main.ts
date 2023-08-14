import { unmarshalPrivateKey } from '@libp2p/crypto/keys'
import { mplex } from '@libp2p/mplex'
import { createFromPrivKey } from '@libp2p/peer-id-factory'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p } from 'libp2p'
import { plaintext } from 'libp2p/insecure'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { defaultInit, perfService } from '../src/index.js'

const argv = yargs(hideBin(process.argv))
  .options({
    'run-server': {
      type: 'boolean',
      demandOption: true,
      default: false,
      description: 'Whether to run as a server'
    },
    'server-address': {
      type: 'string',
      demandOption: false,
      description: 'Server IP address',
      default: ''
    },
    transport: {
      type: 'string',
      demandOption: false,
      description: 'Transport to use',
      default: 'tcp'
    },
    'upload-bytes': {
      type: 'number',
      demandOption: false,
      description: 'Number of bytes to upload',
      default: 0
    },
    'download-bytes': {
      type: 'number',
      demandOption: false,
      description: 'Number of bytes to download',
      default: 0
    }
  })
  .command('help', 'Print usage information', yargs.help)
  .parseSync()

export async function main (runServer: boolean, serverIpAddress: string, transport: string, uploadBytes: number, downloadBytes: number): Promise<void> {
  const listenAddrs: string[] = []

  const { host, port } = splitHostPort(serverIpAddress)
  // #TODO: right now we only support tcp
  const tcpMultiaddr = multiaddr(`/ip4/${host}/tcp/${port}`)

  const config = {
    transports: [tcp()],
    streamMuxers: [mplex()],
    connectionEncryption: [
      plaintext()
    ],
    services: {
      perf: perfService(defaultInit)
    }
  }

  const testPrivKey = 'CAASpgkwggSiAgEAAoIBAQC2SKo/HMFZeBml1AF3XijzrxrfQXdJzjePBZAbdxqKR1Mc6juRHXij6HXYPjlAk01BhF1S3Ll4Lwi0cAHhggf457sMg55UWyeGKeUv0ucgvCpBwlR5cQ020i0MgzjPWOLWq1rtvSbNcAi2ZEVn6+Q2EcHo3wUvWRtLeKz+DZSZfw2PEDC+DGPJPl7f8g7zl56YymmmzH9liZLNrzg/qidokUv5u1pdGrcpLuPNeTODk0cqKB+OUbuKj9GShYECCEjaybJDl9276oalL9ghBtSeEv20kugatTvYy590wFlJkkvyl+nPxIH0EEYMKK9XRWlu9XYnoSfboiwcv8M3SlsjAgMBAAECggEAZtju/bcKvKFPz0mkHiaJcpycy9STKphorpCT83srBVQi59CdFU6Mj+aL/xt0kCPMVigJw8P3/YCEJ9J+rS8BsoWE+xWUEsJvtXoT7vzPHaAtM3ci1HZd302Mz1+GgS8Epdx+7F5p80XAFLDUnELzOzKftvWGZmWfSeDnslwVONkL/1VAzwKy7Ce6hk4SxRE7l2NE2OklSHOzCGU1f78ZzVYKSnS5Ag9YrGjOAmTOXDbKNKN/qIorAQ1bovzGoCwx3iGIatQKFOxyVCyO1PsJYT7JO+kZbhBWRRE+L7l+ppPER9bdLFxs1t5CrKc078h+wuUr05S1P1JjXk68pk3+kQKBgQDeK8AR11373Mzib6uzpjGzgNRMzdYNuExWjxyxAzz53NAR7zrPHvXvfIqjDScLJ4NcRO2TddhXAfZoOPVH5k4PJHKLBPKuXZpWlookCAyENY7+Pd55S8r+a+MusrMagYNljb5WbVTgN8cgdpim9lbbIFlpN6SZaVjLQL3J8TWH6wKBgQDSChzItkqWX11CNstJ9zJyUE20I7LrpyBJNgG1gtvz3ZMUQCn3PxxHtQzN9n1P0mSSYs+jBKPuoSyYLt1wwe10/lpgL4rkKWU3/m1Myt0tveJ9WcqHh6tzcAbb/fXpUFT/o4SWDimWkPkuCb+8j//2yiXk0a/T2f36zKMuZvujqQKBgC6B7BAQDG2H2B/ijofp12ejJU36nL98gAZyqOfpLJ+FeMz4TlBDQ+phIMhnHXA5UkdDapQ+zA3SrFk+6yGk9Vw4Hf46B+82SvOrSbmnMa+PYqKYIvUzR4gg34rL/7AhwnbEyD5hXq4dHwMNsIDq+l2elPjwm/U9V0gdAl2+r50HAoGALtsKqMvhv8HucAMBPrLikhXP/8um8mMKFMrzfqZ+otxfHzlhI0L08Bo3jQrb0Z7ByNY6M8epOmbCKADsbWcVre/AAY0ZkuSZK/CaOXNX/AhMKmKJh8qAOPRY02LIJRBCpfS4czEdnfUhYV/TYiFNnKRj57PPYZdTzUsxa/yVTmECgYBr7slQEjb5Onn5mZnGDh+72BxLNdgwBkhO0OCdpdISqk0F0Pxby22DFOKXZEpiyI9XYP1C8wPiJsShGm2yEwBPWXnrrZNWczaVuCbXHrZkWQogBDG3HGXNdU4MAWCyiYlyinIBpPpoAJZSzpGLmWbMWh28+RJS6AQX6KHrK1o2uw=='
  const encoded = uint8ArrayFromString(testPrivKey, 'base64pad')
  const privateKey = await unmarshalPrivateKey(encoded)
  const peerId = await createFromPrivKey(privateKey)
  const tcpMultiaddrAddress = `${tcpMultiaddr.toString()}/p2p/${peerId.toString()}`

  if (runServer) {
    listenAddrs.push(tcpMultiaddrAddress)

    Object.assign(config, {
      peerId,
      addresses: {
        listen: listenAddrs
      }
    })
  }

  const node = await createLibp2p(config)

  await node.start()

  const startTime = Date.now()

  if (!runServer) {
    const connection = await node.dial(multiaddr(tcpMultiaddrAddress))
    const duration = await node.services.perf.measurePerformance(startTime, connection, BigInt(uploadBytes), BigInt(downloadBytes))
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ latency: duration / 1000 }))
    await node.stop()
  }
}

function splitHostPort (address: string): { host: string, port?: string } {
  try {
    const parts = address.split(':')
    const host = parts[0]
    const port = parts[1]
    return {
      host,
      port
    }
  } catch (error) {
    throw Error('Invalid server address')
  }
}

main(argv['run-server'], argv['server-address'], argv.transport, argv['upload-bytes'], argv['download-bytes']).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
