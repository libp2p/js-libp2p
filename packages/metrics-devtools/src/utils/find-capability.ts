import { gatherCapabilities } from './gather-capabilities.js'

export function findCapability (capability: string, components: any): any | undefined {
  for (const [name, capabilities] of Object.entries(gatherCapabilities(components))) {
    if (capabilities.includes(capability)) {
      return components[name]
    }
  }
}
