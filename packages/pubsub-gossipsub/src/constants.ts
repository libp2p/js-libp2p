export const second = 1000
export const minute = 60 * second

// Protocol identifiers

export const FloodsubID = '/floodsub/1.0.0'

/**
 * The protocol ID for version 1.0.0 of the Gossipsub protocol
 * It is advertised along with GossipsubIDv11 for backwards compatability
 */
export const GossipsubIDv10 = '/meshsub/1.0.0'

/**
 * The protocol ID for version 1.1.0 of the Gossipsub protocol
 * See the spec for details about how v1.1.0 compares to v1.0.0:
 * https://github.com/libp2p/specs/blob/master/pubsub/gossipsub/gossipsub-v1.1.md
 */
export const GossipsubIDv11 = '/meshsub/1.1.0'

// Overlay parameters

/**
 * GossipsubD sets the optimal degree for a Gossipsub topic mesh. For example, if GossipsubD == 6,
 * each peer will want to have about six peers in their mesh for each topic they're subscribed to.
 * GossipsubD should be set somewhere between GossipsubDlo and GossipsubDhi.
 */
export const GossipsubD = 6

/**
 * GossipsubDlo sets the lower bound on the number of peers we keep in a Gossipsub topic mesh.
 * If we have fewer than GossipsubDlo peers, we will attempt to graft some more into the mesh at
 * the next heartbeat.
 */
export const GossipsubDlo = 4

/**
 * GossipsubDhi sets the upper bound on the number of peers we keep in a Gossipsub topic mesh.
 * If we have more than GossipsubDhi peers, we will select some to prune from the mesh at the next heartbeat.
 */
export const GossipsubDhi = 12

/**
 * GossipsubDscore affects how peers are selected when pruning a mesh due to over subscription.
 * At least GossipsubDscore of the retained peers will be high-scoring, while the remainder are
 * chosen randomly.
 */
export const GossipsubDscore = 4

/**
 * GossipsubDout sets the quota for the number of outbound connections to maintain in a topic mesh.
 * When the mesh is pruned due to over subscription, we make sure that we have outbound connections
 * to at least GossipsubDout of the survivor peers. This prevents sybil attackers from overwhelming
 * our mesh with incoming connections.
 *
 * GossipsubDout must be set below GossipsubDlo, and must not exceed GossipsubD / 2.
 */
export const GossipsubDout = 2

// Gossip parameters

/**
 * GossipsubHistoryLength controls the size of the message cache used for gossip.
 * The message cache will remember messages for GossipsubHistoryLength heartbeats.
 */
export const GossipsubHistoryLength = 5

/**
 * GossipsubHistoryGossip controls how many cached message ids we will advertise in
 * IHAVE gossip messages. When asked for our seen message IDs, we will return
 * only those from the most recent GossipsubHistoryGossip heartbeats. The slack between
 * GossipsubHistoryGossip and GossipsubHistoryLength allows us to avoid advertising messages
 * that will be expired by the time they're requested.
 *
 * GossipsubHistoryGossip must be less than or equal to GossipsubHistoryLength to
 * avoid a runtime panic.
 */
export const GossipsubHistoryGossip = 3

/**
 * GossipsubDlazy affects how many peers we will emit gossip to at each heartbeat.
 * We will send gossip to at least GossipsubDlazy peers outside our mesh. The actual
 * number may be more, depending on GossipsubGossipFactor and how many peers we're
 * connected to.
 */
export const GossipsubDlazy = 6

/**
 * GossipsubGossipFactor affects how many peers we will emit gossip to at each heartbeat.
 * We will send gossip to GossipsubGossipFactor * (total number of non-mesh peers), or
 * GossipsubDlazy, whichever is greater.
 */
export const GossipsubGossipFactor = 0.25

/**
 * GossipsubGossipRetransmission controls how many times we will allow a peer to request
 * the same message id through IWANT gossip before we start ignoring them. This is designed
 * to prevent peers from spamming us with requests and wasting our resources.
 */
export const GossipsubGossipRetransmission = 3

// Heartbeat interval

/**
 * GossipsubHeartbeatInitialDelay is the short delay before the heartbeat timer begins
 * after the router is initialized.
 */
export const GossipsubHeartbeatInitialDelay = 100

/**
 * GossipsubHeartbeatInterval controls the time between heartbeats.
 */
export const GossipsubHeartbeatInterval = second

/**
 * GossipsubFanoutTTL controls how long we keep track of the fanout state. If it's been
 * GossipsubFanoutTTL since we've published to a topic that we're not subscribed to,
 * we'll delete the fanout map for that topic.
 */
export const GossipsubFanoutTTL = minute

/**
 * GossipsubPrunePeers controls the number of peers to include in prune Peer eXchange.
 * When we prune a peer that's eligible for PX (has a good score, etc), we will try to
 * send them signed peer records for up to GossipsubPrunePeers other peers that we
 * know of.
 */
export const GossipsubPrunePeers = 16

/**
 * GossipsubPruneBackoff controls the backoff time for pruned peers. This is how long
 * a peer must wait before attempting to graft into our mesh again after being pruned.
 * When pruning a peer, we send them our value of GossipsubPruneBackoff so they know
 * the minimum time to wait. Peers running older versions may not send a backoff time,
 * so if we receive a prune message without one, we will wait at least GossipsubPruneBackoff
 * before attempting to re-graft.
 */
export const GossipsubPruneBackoff = minute

/**
 * GossipsubPruneBackoffTicks is the number of heartbeat ticks for attempting to prune expired
 * backoff timers.
 */
export const GossipsubPruneBackoffTicks = 15

/**
 * GossipsubConnectors controls the number of active connection attempts for peers obtained through PX.
 */
export const GossipsubConnectors = 8

/**
 * GossipsubMaxPendingConnections sets the maximum number of pending connections for peers attempted through px.
 */
export const GossipsubMaxPendingConnections = 128

/**
 * GossipsubConnectionTimeout controls the timeout for connection attempts.
 */
export const GossipsubConnectionTimeout = 30 * second

/**
 * GossipsubDirectConnectTicks is the number of heartbeat ticks for attempting to reconnect direct peers
 * that are not currently connected.
 */
export const GossipsubDirectConnectTicks = 300

/**
 * GossipsubDirectConnectInitialDelay is the initial delay before opening connections to direct peers
 */
export const GossipsubDirectConnectInitialDelay = second

/**
 * GossipsubOpportunisticGraftTicks is the number of heartbeat ticks for attempting to improve the mesh
 * with opportunistic grafting. Every GossipsubOpportunisticGraftTicks we will attempt to select some
 * high-scoring mesh peers to replace lower-scoring ones, if the median score of our mesh peers falls
 * below a threshold
 */
export const GossipsubOpportunisticGraftTicks = 60

/**
 * GossipsubOpportunisticGraftPeers is the number of peers to opportunistically graft.
 */
export const GossipsubOpportunisticGraftPeers = 2

/**
 * If a GRAFT comes before GossipsubGraftFloodThreshold has elapsed since the last PRUNE,
 * then there is an extra score penalty applied to the peer through P7.
 */
export const GossipsubGraftFloodThreshold = 10 * second

/**
 * GossipsubMaxIHaveLength is the maximum number of messages to include in an IHAVE message.
 * Also controls the maximum number of IHAVE ids we will accept and request with IWANT from a
 * peer within a heartbeat, to protect from IHAVE floods. You should adjust this value from the
 * default if your system is pushing more than 5000 messages in GossipsubHistoryGossip heartbeats;
 * with the defaults this is 1666 messages/s.
 */
export const GossipsubMaxIHaveLength = 5000

/**
 * GossipsubMaxIHaveMessages is the maximum number of IHAVE messages to accept from a peer within a heartbeat.
 */
export const GossipsubMaxIHaveMessages = 10

/**
 * Time to wait for a message requested through IWANT following an IHAVE advertisement.
 * If the message is not received within this window, a broken promise is declared and
 * the router may apply bahavioural penalties.
 */
export const GossipsubIWantFollowupTime = 3 * second

/**
 * Time in milliseconds to keep message ids in the seen cache
 */
export const GossipsubSeenTTL = 2 * minute

export const TimeCacheDuration = 120 * 1000

export const ERR_TOPIC_VALIDATOR_REJECT = 'ERR_TOPIC_VALIDATOR_REJECT'
export const ERR_TOPIC_VALIDATOR_IGNORE = 'ERR_TOPIC_VALIDATOR_IGNORE'

/**
 * If peer score is better than this, we accept messages from this peer
 * within ACCEPT_FROM_WHITELIST_DURATION_MS from the last time computing score.
 **/
export const ACCEPT_FROM_WHITELIST_THRESHOLD_SCORE = 0

/**
 * If peer score >= ACCEPT_FROM_WHITELIST_THRESHOLD_SCORE, accept up to this
 * number of messages from that peer.
 */
export const ACCEPT_FROM_WHITELIST_MAX_MESSAGES = 128

/**
 * If peer score >= ACCEPT_FROM_WHITELIST_THRESHOLD_SCORE, accept messages from
 * this peer up to this time duration.
 */
export const ACCEPT_FROM_WHITELIST_DURATION_MS = 1000

/**
 * The default MeshMessageDeliveriesWindow to be used in metrics.
 */
export const DEFAULT_METRIC_MESH_MESSAGE_DELIVERIES_WINDOWS = 1000
