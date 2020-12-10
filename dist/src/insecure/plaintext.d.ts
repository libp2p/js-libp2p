export type Connection = import("libp2p-interfaces/src/connection/connection");
export const protocol: "/plaintext/2.0.0";
import PeerId = require("peer-id");
export declare function secureInbound(localId: any, conn: any, remoteId: any): Promise<{
    conn: any;
    remotePeer: PeerId;
}>;
export declare function secureOutbound(localId: any, conn: any, remoteId: any): Promise<{
    conn: any;
    remotePeer: PeerId;
}>;
//# sourceMappingURL=plaintext.d.ts.map