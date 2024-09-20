import { InvalidParametersError, isPubSub } from '@libp2p/interface'
import type { PubSub } from '@libp2p/interface'

export function getPubSub (component: string, components: any): PubSub {
  const pubsub = components[component]

  if (!isPubSub(pubsub)) {
    throw new InvalidParametersError(`Component ${component} did not implement the PubSub interface`)
  }

  return pubsub
}
