export type Connection = import("libp2p-interfaces/src/connection/connection");
export const protocol: "/plaintext/2.0.0";
import PeerId = require("peer-id");
export declare function secureInbound(localId: PeerId, conn: import("libp2p-interfaces/src/connection/connection"), remoteId: PeerId | undefined): Promise<{
    conn: any;
    remotePeer: PeerId;
}>;
export declare function secureOutbound(localId: PeerId, conn: import("libp2p-interfaces/src/connection/connection"), remoteId: PeerId | undefined): Promise<{
    conn: any;
    remotePeer: PeerId;
}>;
//# sourceMappingURL=plaintext.d.ts.map