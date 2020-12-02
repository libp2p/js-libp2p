export = pubsubAdapter;
/**
 * @typedef {import('libp2p-interfaces/src/pubsub').InMessage} InMessage
 * @typedef {import('libp2p-interfaces/src/pubsub')} PubsubRouter
 */
declare function pubsubAdapter(PubsubRouter: any, libp2p: any, options: any): any;
declare namespace pubsubAdapter {
    export { InMessage, PubsubRouter };
}
type InMessage = {
    from?: string | undefined;
    receivedFrom: string;
    topicIDs: string[];
    seqno?: Uint8Array | undefined;
    data: Uint8Array;
    signature?: Uint8Array | undefined;
    key?: Uint8Array | undefined;
};
type PubsubRouter = import("libp2p-interfaces/src/pubsub");
//# sourceMappingURL=pubsub-adapter.d.ts.map