export function validate(opts: Libp2pOptions): {
    addresses: {
        listen: never[];
        announce: never[];
        noAnnounce: never[];
        announceFilter: (multiaddrs: Multiaddr[]) => import("multiaddr").Multiaddr[];
    };
    connectionManager: {
        minConnections: number;
    };
    connectionGater: {};
    transportManager: {
        faultTolerance: number;
    };
    dialer: {
        maxParallelDials: number;
        maxDialsPerPeer: number;
        dialTimeout: number;
        resolvers: {
            dnsaddr: any;
        };
        addressSorter: typeof publicAddressesFirst;
    };
    host: {
        agentVersion: string;
    };
    metrics: {
        enabled: boolean;
    };
    peerStore: {
        persistence: boolean;
        threshold: number;
    };
    peerRouting: {
        refreshManager: {
            enabled: boolean;
            interval: number;
            bootDelay: number;
        };
    };
    config: {
        protocolPrefix: string;
        dht: {
            enabled: boolean;
            kBucketSize: number;
        };
        nat: {
            enabled: boolean;
            ttl: number;
            keepAlive: boolean;
            gateway: null;
            externalIp: null;
            pmp: {
                enabled: boolean;
            };
        };
        peerDiscovery: {
            autoDial: boolean;
        };
        pubsub: {
            enabled: boolean;
        };
        relay: {
            enabled: boolean;
            advertise: {
                bootDelay: number;
                enabled: boolean;
                ttl: number;
            };
            hop: {
                enabled: boolean;
                active: boolean;
            };
            autoRelay: {
                enabled: boolean;
                maxListeners: number;
            };
        };
        transport: {};
    };
} & Libp2pOptions & constructorOptions;
export type Multiaddr = import('multiaddr').Multiaddr;
export type ConnectionGater = import('./types').ConnectionGater;
export type Libp2pOptions = import('.').Libp2pOptions;
export type constructorOptions = import('.').constructorOptions;
//# sourceMappingURL=config.d.ts.map