# GossipSub Partial Messages Extension - Implementation Spec

## Context

Implements libp2p spec PR #685: a **Partial Messages Extension** for GossipSub that lets nodes send parts of large messages instead of full messages. This is critical for Ethereum's Fusaka Data Availability protocol where nodes often miss only 1-2 cells (~2KiB each) of a 64KiB message, saving ~500KiB/slot/node.

The spec adds new protobuf messages, subscription signaling, extension handshakes, and heartbeat gossip of parts metadata. A reference implementation exists at raulk/js-libp2p-gossipsub PR #1 (targeting libp2pV2), but we implement from first principles on the current libp2pV3 codebase.

**Scope**: Only `packages/gossipsub/` is affected. No changes needed to `@libp2p/interface`, `@libp2p/libp2p`, or any other package.

---

## Files to Modify/Create

### Modified Files
| File | Changes |
|------|---------|
| `src/message/rpc.proto` | Add SubOpts fields 3-4, ControlMessage field 6, RPC field 10, new messages |
| `src/message/rpc.ts` | Add protons codecs for ControlExtensions, PartialMessagesExtension; modify SubOpts, ControlMessage, RPC |
| `src/message/decodeRpc.ts` | Add `maxPartialMessageSize` decode limit |
| `src/types.ts` | Add `PartialMessage`, `PartialSubscriptionOpts`, `PartsMetadataMerger` interfaces |
| `src/index.ts` | Extend `GossipsubOpts`, `GossipSub` interface, `GossipSubEvents`; add exports |
| `src/constants.ts` | Add partial message constants (maxGroups, TTL, maxMetadataSize) |
| `src/utils/create-gossip-rpc.ts` | Add `partial` param to `createGossipRpc`, `extensions` to `ensureControl` |
| `src/gossipsub.ts` | New fields, constructor init, subscribePartial/unsubscribePartial/publishPartial, handleReceivedPartial, extension handshake in sendRpc, heartbeat gossip, removePeer cleanup |
| `package.json` | Add `./partial` export path |

### New Files
| File | Purpose |
|------|---------|
| `src/partial/bitwise-or-merger.ts` | Default `PartsMetadataMerger` using bitwise OR |
| `src/partial/partial-message-state.ts` | Per-topic group state, LRU eviction, TTL cleanup, peer metadata tracking |
| `src/partial/index.ts` | Barrel exports |
| `test/partial/bitwise-or-merger.spec.ts` | BitwiseOrMerger unit tests |
| `test/partial/partial-message-state.spec.ts` | PartialMessageState unit tests |
| `test/partial-messages.spec.ts` | Integration tests: subscription signaling, publish, heartbeat gossip, cleanup |

---

## Protobuf Wire Changes

```protobuf
# Added to SubOpts:
optional bool requestsPartial = 3;          # wire tag 24
optional bool supportsSendingPartial = 4;    # wire tag 32

# Added to ControlMessage:
optional ControlExtensions extensions = 6;   # wire tag 50

# New message:
message ControlExtensions {
  optional bool partialMessages = 10;        # wire tag 80
}

# Added to RPC:
optional PartialMessagesExtension partial = 10;  # wire tag 82

# New message:
message PartialMessagesExtension {
  optional bytes topicID = 1;                # wire tag 10
  optional bytes groupID = 2;               # wire tag 18
  optional bytes partialMessage = 3;        # wire tag 26
  optional bytes partsMetadata = 4;         # wire tag 34
}
```

Backward compatible: all fields are `optional`, and existing decoders skip unknown fields via `reader.skipType(tag & 7)`.

---

## Key Implementation Details

### New Types (`src/types.ts`)
```typescript
interface PartialMessage {
  topic: TopicStr; groupID: Uint8Array
  partialMessage?: Uint8Array; partsMetadata: Uint8Array
}
interface PartialSubscriptionOpts {
  requestsPartial: boolean; supportsSendingPartial: boolean
}
interface PartsMetadataMerger { merge(a: Uint8Array, b: Uint8Array): Uint8Array }
```

### New GossipSub Fields (`src/gossipsub.ts`)
- `partialTopics: Map<TopicStr, PartialSubscriptionOpts>` - topics we subscribe to with partial support
- `partialMessageState: Map<TopicStr, PartialMessageState>` - per-topic group tracking
- `peerPartialOpts: Map<PeerIdStr, Map<TopicStr, PartialSubscriptionOpts>>` - what peers want
- `sentExtensions: Set<PeerIdStr>` - extension handshake tracking
- `partsMetadataMerger: PartsMetadataMerger` - configurable merger (default: BitwiseOrMerger)

### New Methods
- `subscribePartial(topic, opts)` - subscribe with partial flags; sends updated SubOpts to peers
- `unsubscribePartial(topic)` - remove partial support for topic
- `publishPartial(partialMsg)` - send partial to requesting peers, metadata-only to supporting peers
- `handleReceivedPartial(from, partial)` - process incoming partial RPC; update state; dispatch event
- `emitPartialGossip(peersToGossipByTopic)` - heartbeat: send partsMetadata to non-mesh partial peers

### Integration Points
- **`sendSubscriptions`**: Include `requestsPartial`/`supportsSendingPartial` in SubOpts when topic has partial support
- **`handleReceivedRpc`**: Process `rpc.partial` field; track peer partial opts from SubOpts; handle ControlExtensions
- **`sendRpc`**: On first RPC to each peer, include `control.extensions.partialMessages = true` (handshake)
- **`heartbeat`**: Call `emitPartialGossip()`; prune expired PartialMessageState groups; skip IHAVE for partial-requesting peers
- **`removePeer`**: Clean up `peerPartialOpts`, `sentExtensions`, per-topic PartialMessageState peer entries

### PartialMessageState (`src/partial/partial-message-state.ts`)
- Per-group state: local metadata, per-peer metadata, timestamps
- LRU eviction at configurable `maxGroups` (default 128 per topic)
- TTL-based pruning at configurable `groupTTLMs` (default 2 min)
- `getPartsToSend(peerId, groupID)` - returns what parts peer still needs
- `getGroupsForGossip()` - returns groups with metadata for heartbeat gossip
- `removePeer(peerId)` - clean up all peer entries across groups

---

## Implementation Order

```
T1: rpc.proto changes (no deps)
T2: types.ts new interfaces (no deps)
T3: constants.ts new constants (no deps)
    |
    v
T4: rpc.ts codec changes (depends: T1)
T5: decodeRpc.ts limits (depends: T4)
T6: partial/bitwise-or-merger.ts (depends: T2)
T7: partial/partial-message-state.ts (depends: T2, T6)
T8: partial/index.ts barrel (depends: T6, T7)
T9: create-gossip-rpc.ts utility (depends: T4)
    |
    v
T10: index.ts exports + opts + interface (depends: T2, T8)
T11: package.json export path (depends: T8)
T12: gossipsub.ts integration (depends: T4, T5, T6, T7, T8, T9, T10)
    |
    v
T13: test/partial/bitwise-or-merger.spec.ts (depends: T6)
T14: test/partial/partial-message-state.spec.ts (depends: T7)
T15: test/partial-messages.spec.ts (depends: T12)
```

Work streams for parallelization:
- **Stream 1**: T1 -> T4 -> T5 -> T9 (protobuf + RPC utilities)
- **Stream 2**: T2 -> T6 -> T7 -> T8 (types + partial module)
- **Stream 3**: T3 (constants, independent)
- **Stream 4** (blocked on 1+2+3): T10 -> T11 -> T12 (integration)
- **Stream 5** (blocked on 2): T13, T14 (unit tests)
- **Stream 6** (blocked on 4): T15 (integration tests)

---

## Verification

1. **Build**: `npm run -w packages/gossipsub build` -- must compile without errors
2. **Existing tests**: `npm run -w packages/gossipsub test:node` -- all existing tests must pass
3. **New unit tests**: `npm run -w packages/gossipsub test:node -- --grep "BitwiseOrMerger"` and `--grep "PartialMessageState"`
4. **New integration tests**: `npm run -w packages/gossipsub test:node -- --grep "partial messages"`
5. **Lint**: `npm run -w packages/gossipsub lint`
6. **Protobuf round-trip**: Verify encode/decode of new messages preserves all fields

---

## Risks

- **Wire compatibility**: LOW risk. All new fields are `optional` with unknown-field skipping.
- **Memory growth**: Mitigated by LRU + TTL in PartialMessageState.
- **Mixed network**: Application must call both `publish()` and `publishPartial()`. Documented clearly.
- **No scoring for partial messages**: By design in v1. Partial messages bypass message validation pipeline.
- **TopicID bytes<->string conversion**: Must use consistent TextEncoder/TextDecoder. Shared helper recommended.
