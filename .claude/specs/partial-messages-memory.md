# GossipSub Partial Messages - Implementation Memory

## Status: ALL TASKS COMPLETE

## Completed Steps

### Task 1: Protobuf + Codec - DONE (by protobuf-agent)
- `src/message/rpc.proto` - Added SubOpts fields 3-4, ControlMessage field 6, ControlExtensions message, RPC field 10, PartialMessagesExtension message
- `src/message/rpc.ts` - Added protons codecs for all new types: SubOpts (requestsPartial/supportsSendingPartial), ControlMessage (extensions), ControlExtensions, PartialMessagesExtension, RPC (partial)
- `src/message/decodeRpc.ts` - Added maxPartialMessageSize to DecodeRPCLimits and defaultDecodeRpcLimits

### Task 2: Types + Constants + Partial Module - DONE (by types-agent)
- `src/types.ts` - Added PartialMessage, PartialSubscriptionOpts, PartsMetadataMerger interfaces
- `src/constants.ts` - Added PartialMessagesMaxGroups (128), PartialMessagesGroupTTLMs (2min), PartialMessagesMaxMetadataSize (1024)
- `src/partial/bitwise-or-merger.ts` - BitwiseOrMerger class implementing PartsMetadataMerger
- `src/partial/partial-message-state.ts` - PartialMessageState class with LRU, TTL, groupKey, updateMetadata, getLocalMetadata, getPeerMetadata, getGroupsForGossip, removePeer, pruneExpired
- `src/partial/index.ts` - Barrel exports

### Task 3: Utility + Exports + Package - DONE (by team-lead)
- `src/utils/create-gossip-rpc.ts` - Added `partial` param to createGossipRpc; fixed ensureControl return type for optional `partial` field
- `src/index.ts` - Added PartialMessage/PartialSubscriptionOpts/PartsMetadataMerger imports + re-exports; GossipsubOpts partial fields (partsMetadataMerger, partialMessagesMaxGroups, partialMessagesGroupTTLMs); GossipSubEvents gossipsub:partial-message; GossipSub interface subscribePartial/unsubscribePartial/publishPartial
- `package.json` - Added ./partial export path

### Task 4: gossipsub.ts Integration - DONE (by team-lead)
- Added imports: BitwiseOrMerger, PartialMessageState, new constants, new types
- Added new fields: partialTopics, partialMessageState, peerPartialOpts, sentExtensions, partsMetadataMerger, textEncoder, textDecoder
- Constructor: initializes partsMetadataMerger (defaults to BitwiseOrMerger)
- stop(): clears all partial state maps
- removePeer(): cleans up peerPartialOpts, sentExtensions, partialMessageState peer entries
- sendSubscriptions(): includes requestsPartial/supportsSendingPartial from partialTopics
- handleReceivedRpc(): tracks peer partial opts from SubOpts; processes rpc.partial
- handleControlMessage(): logs ControlExtensions.partialMessages handshake
- sendRpc(): extension handshake on first RPC to each peer (sentExtensions tracking)
- subscribePartial(): sets partial opts, creates PartialMessageState, subscribes topic, sends subscriptions
- unsubscribePartial(): removes partial opts, clears state, re-sends subscriptions without flags
- publishPartial(): sends full partial to requestsPartial peers, metadata-only to supportsSendingPartial peers
- handleReceivedPartial(): validates, updates state, dispatches gossipsub:partial-message event
- emitPartialGossip(): heartbeat gossip of partsMetadata to non-mesh partial peers
- heartbeat(): calls emitPartialGossip + pruneExpired on all PartialMessageState

### Task 5: Tests - DONE (by team-lead)
- `test/partial/bitwise-or-merger.spec.ts` - 7 unit tests for BitwiseOrMerger
- `test/partial/partial-message-state.spec.ts` - 8 unit tests for PartialMessageState (track, merge, evict, prune, removePeer, gossip, clear, unknown)
- `test/partial-messages.spec.ts` - Integration tests: subscription signaling, protobuf round-trip (SubOpts, ControlExtensions, PartialMessagesExtension, full RPC, backward compat), publishPartial event dispatch, cleanup

### Task 6: Build Verification - DONE
- TypeScript compilation: 0 new errors (all errors are pre-existing monorepo dependency resolution issues)
- Our files: src/partial/*, src/message/rpc.ts, src/message/decodeRpc.ts, src/types.ts, src/constants.ts, src/utils/create-gossip-rpc.ts, src/index.ts, src/gossipsub.ts all compile cleanly
- NOTE: Full monorepo build fails due to pre-existing @libp2p/crypto and @libp2p/interface-internal build errors, not related to our changes

## Files Modified
- `src/message/rpc.proto`
- `src/message/rpc.ts`
- `src/message/decodeRpc.ts`
- `src/types.ts`
- `src/constants.ts`
- `src/utils/create-gossip-rpc.ts`
- `src/index.ts`
- `src/gossipsub.ts`
- `package.json`

## Files Created
- `src/partial/bitwise-or-merger.ts`
- `src/partial/partial-message-state.ts`
- `src/partial/index.ts`
- `test/partial/bitwise-or-merger.spec.ts`
- `test/partial/partial-message-state.spec.ts`
- `test/partial-messages.spec.ts`

## Key Design Decisions
- TextEncoder/TextDecoder used for topicID bytes<->string conversion
- Extension handshake: sentExtensions Set tracks which peers received control.extensions.partialMessages=true
- partsMetadataMerger defaults to BitwiseOrMerger if not provided in options
- PartialMessageState is per-topic, stored in Map<TopicStr, PartialMessageState>
- publishPartial sends full partial to requesting peers, metadata-only to supporting peers
- All new protobuf fields are optional for backward compatibility
- ensureControl return type changed to Required<Pick<RPC, 'subscriptions' | 'messages' | 'control'>> & RPC to accommodate optional `partial` field
