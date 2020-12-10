export function handleStop({ connection, request, streamHandler }: {
    connection: Connection;
    request: CircuitRequest;
    streamHandler: StreamHandler;
}): Promise<MuxedStream> | void;
export function stop({ connection, request }: {
    connection: Connection;
    request: CircuitRequest;
}): Promise<MuxedStream | void>;
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
export type CircuitRequest = {
    type: import("../../types").CircuitType;
    code?: 100 | 220 | 221 | 250 | 251 | 260 | 261 | 262 | 270 | 280 | 320 | 321 | 350 | 351 | 390 | 400 | undefined;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
import StreamHandler = require("./stream-handler");
//# sourceMappingURL=stop.d.ts.map