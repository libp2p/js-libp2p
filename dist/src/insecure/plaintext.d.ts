export type Connection = import("libp2p-interfaces/src/connection/connection");
export const protocol: "/plaintext/2.0.0";
export declare function secureInbound(localId: any, conn: any, remoteId: any): Promise<{
    conn: any;
    remotePeer: import("peer-id");
}>;
export declare function secureOutbound(localId: any, conn: any, remoteId: any): Promise<{
    conn: any;
    remotePeer: import("peer-id");
}>;
//# sourceMappingURL=plaintext.d.ts.map