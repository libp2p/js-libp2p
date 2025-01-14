import { serviceCapabilities } from '@libp2p/interface'

export function gatherCapabilities (components: any): Record<string, string[]> {
  const capabilities: Record<string, string[]> = {}
  const services: Record<string, any> = components.components ?? components

  Object.entries(services).forEach(([name, component]) => {
    if (component?.[serviceCapabilities] != null && Array.isArray(component[serviceCapabilities])) {
      capabilities[name] = component[serviceCapabilities]
    }
  })

  return capabilities
}
