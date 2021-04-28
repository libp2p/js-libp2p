export = NatManager;
declare class NatManager {
    /**
     * @class
     * @param {NatManagerProperties & NatManagerOptions} options
     */
    constructor({ peerId, addressManager, transportManager, ...options }: NatManagerProperties & NatManagerOptions);
    _peerId: import("peer-id");
    _addressManager: import("./address-manager");
    _transportManager: import("./transport-manager");
    _enabled: boolean;
    _externalIp: string | undefined;
    _options: {
        description: string;
        ttl: number;
        autoUpdate: true;
        gateway: string | undefined;
        enablePMP: boolean;
    };
    /**
     * Starts the NAT manager
     */
    start(): void;
    _start(): Promise<void>;
    _getClient(): {
        /**
         * @param  {...any} args
         * @returns {Promise<void>}
         */
        map: (...args: any[]) => Promise<void>;
        /**
         * @param  {...any} args
         * @returns {Promise<void>}
         */
        destroy: (...args: any[]) => Promise<void>;
        /**
         * @param  {...any} args
         * @returns {Promise<string>}
         */
        externalIp: (...args: any[]) => Promise<string>;
    };
    _client: {
        /**
         * @param  {...any} args
         * @returns {Promise<void>}
         */
        map: (...args: any[]) => Promise<void>;
        /**
         * @param  {...any} args
         * @returns {Promise<void>}
         */
        destroy: (...args: any[]) => Promise<void>;
        /**
         * @param  {...any} args
         * @returns {Promise<string>}
         */
        externalIp: (...args: any[]) => Promise<string>;
    } | null | undefined;
    /**
     * Stops the NAT manager
     *
     * @async
     */
    stop(): Promise<void>;
}
declare namespace NatManager {
    export { PeerId, TransportManager, AddressManager, NatManagerProperties, NatManagerOptions };
}
type NatManagerProperties = {
    /**
     * - The peer ID of the current node
     */
    peerId: PeerId;
    /**
     * - A transport manager
     */
    transportManager: TransportManager;
    /**
     * - An address manager
     */
    addressManager: AddressManager;
};
type NatManagerOptions = {
    /**
     * - Whether to enable the NAT manager
     */
    enabled: boolean;
    /**
     * - Pass a value to use instead of auto-detection
     */
    externalIp?: string | undefined;
    /**
     * - A string value to use for the port mapping description on the gateway
     */
    description?: string | undefined;
    /**
     * - How long UPnP port mappings should last for in seconds (minimum 1200)
     */
    ttl?: number | undefined;
    /**
     * - Whether to automatically refresh UPnP port mappings when their TTL is reached
     */
    keepAlive?: boolean | undefined;
    /**
     * - Pass a value to use instead of auto-detection
     */
    gateway?: string | undefined;
    /**
     * - PMP options
     */
    pmp?: {
        /**
         * - Whether to enable PMP as well as UPnP
         */
        enabled?: boolean | undefined;
    } | undefined;
};
type PeerId = import('peer-id');
type TransportManager = import('./transport-manager');
type AddressManager = import('./address-manager');
//# sourceMappingURL=nat-manager.d.ts.map