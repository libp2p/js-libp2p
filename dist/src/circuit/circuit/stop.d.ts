export function handleStop({ connection, request, streamHandler }: {
    connection: Connection;
    request: ICircuitRelay;
    streamHandler: StreamHandler;
}): Promise<MuxedStream> | void;
export function stop({ connection, request }: {
    connection: Connection;
    request: ICircuitRelay;
}): Promise<MuxedStream | void>;
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type MuxedStream = import('libp2p-interfaces/src/stream-muxer/types').MuxedStream;
export type ICircuitRelay = import('../protocol').ICircuitRelay;
import StreamHandler = require("./stream-handler");
//# sourceMappingURL=stop.d.ts.map