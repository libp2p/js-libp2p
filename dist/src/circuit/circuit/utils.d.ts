export type StreamHandler = import('./stream-handler');
export type ICircuitRelay = import('../protocol').ICircuitRelay;
/**
 * Validate incomming HOP/STOP message
 *
 * @param {ICircuitRelay} msg - A CircuitRelay unencoded protobuf message
 * @param {StreamHandler} streamHandler
 */
export function validateAddrs(msg: ICircuitRelay, streamHandler: StreamHandler): void;
//# sourceMappingURL=utils.d.ts.map