export function handleStop({ connection, request, streamHandler }: {
    connection: Connection;
    request: CircuitRequest;
    streamHandler: import("./stream-handler")<import("../../types").CircuitRequest>;
}): Promise<MuxedStream> | void;
export function stop({ connection, request }: {
    connection: Connection;
    request: CircuitRequest;
}): Promise<MuxedStream | void>;
export type Connection = import("libp2p-interfaces/src/connection/connection");
export type MuxedStream = import("libp2p-interfaces/src/stream-muxer/types").MuxedStream;
export type CircuitRequest = {
    type: import("../../types").CircuitType;
    dstPeer: import("../../types").CircuitPeer;
    srcPeer: import("../../types").CircuitPeer;
};
export type StreamHandlerT = import("./stream-handler")<import("../../types").CircuitRequest>;
//# sourceMappingURL=stop.d.ts.map