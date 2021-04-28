export = pubsubAdapter;
/**
 * @typedef {import('libp2p-interfaces/src/pubsub').InMessage} InMessage
 * @typedef {import('libp2p-interfaces/src/pubsub')} PubsubRouter
 */
/**
 * @param {{new(...args: any[]): PubsubRouter}} PubsubRouter
 * @param {import('.')} libp2p
 * @param {{ enabled: boolean; } & import(".").PubsubLocalOptions & import("libp2p-interfaces/src/pubsub").PubsubOptions} options
 */
declare function pubsubAdapter(PubsubRouter: new (...args: any[]) => PubsubRouter, libp2p: import('.'), options: {
    enabled: boolean;
} & import(".").PubsubLocalOptions & import("libp2p-interfaces/src/pubsub").PubsubOptions): import("libp2p-interfaces/src/pubsub") & {
    _subscribeAdapter: (topic: string) => void;
    _unsubscribeAdapter: (topic: string) => void;
};
declare namespace pubsubAdapter {
    export { InMessage, PubsubRouter };
}
type PubsubRouter = import('libp2p-interfaces/src/pubsub');
type InMessage = import('libp2p-interfaces/src/pubsub').InMessage;
//# sourceMappingURL=pubsub-adapter.d.ts.map