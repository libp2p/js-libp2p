export interface GossipsubOptsSpec {
  /** D sets the optimal degree for a Gossipsub topic mesh. */
  D: number
  /** Dlo sets the lower bound on the number of peers we keep in a Gossipsub topic mesh. */
  Dlo: number
  /** Dhi sets the upper bound on the number of peers we keep in a Gossipsub topic mesh. */
  Dhi: number
  /** Dscore affects how peers are selected when pruning a mesh due to over subscription. */
  Dscore: number
  /** Dout sets the quota for the number of outbound connections to maintain in a topic mesh. */
  Dout: number
  /** Dlazy affects how many peers we will emit gossip to at each heartbeat. */
  Dlazy: number
  /** heartbeatInterval is the time between heartbeats in milliseconds */
  heartbeatInterval: number
  /**
   * fanoutTTL controls how long we keep track of the fanout state. If it's been
   * fanoutTTL milliseconds since we've published to a topic that we're not subscribed to,
   * we'll delete the fanout map for that topic.
   */
  fanoutTTL: number
  /** mcacheLength is the number of windows to retain full messages for IWANT responses */
  mcacheLength: number
  /** mcacheGossip is the number of windows to gossip about */
  mcacheGossip: number
  /** seenTTL is the number of milliseconds to retain message IDs in the seen cache */
  seenTTL: number
}
