import { dns, RecordType } from '@multiformats/dns'
import { multiaddr } from '@multiformats/multiaddr'
import type { MultiaddrResolver, MultiaddrResolveOptions } from '@libp2p/interface'
import type { DNS } from '@multiformats/dns'
import type { Multiaddr } from '@multiformats/multiaddr'

class DNSAddrResolver implements MultiaddrResolver {
  private dns?: DNS

  canResolve (ma: Multiaddr): boolean {
    return ma.getComponents().some(({ name }) => name === 'dnsaddr')
  }

  async resolve (ma: Multiaddr, options: MultiaddrResolveOptions): Promise<Multiaddr[]> {
    const hostname = ma.getComponents()
      .find(component => component.name === 'dnsaddr')
      ?.value

    if (hostname == null) {
      return [ma]
    }

    const resolver = this.getDNS(options)
    const result = await resolver.query(`_dnsaddr.${hostname}`, {
      signal: options?.signal,
      types: [
        RecordType.TXT
      ]
    })

    const peerId = ma.getComponents()
      .find(component => component.name === 'p2p')
      ?.value
    const output: Multiaddr[] = []

    for (const answer of result.Answer) {
      const addr = answer.data
        .replace(/["']/g, '')
        .trim()
        .split('=')[1]

      if (addr == null) {
        continue
      }

      if (peerId != null && !addr.includes(peerId)) {
        continue
      }

      output.push(multiaddr(addr))
    }

    return output
  }

  private getDNS (options: MultiaddrResolveOptions): DNS {
    if (options.dns != null) {
      return options.dns
    }

    if (this.dns == null) {
      this.dns = dns()
    }

    return this.dns
  }
}

export const dnsaddrResolver = new DNSAddrResolver()
