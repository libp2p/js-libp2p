export class WebRTCTransportError extends Error {
    constructor(msg: string) {
        super(msg);
        this.name = 'WebRTCTransportError';
    }
}

export class InvalidArgumentError extends WebRTCTransportError {
    constructor(msg: string) {
        super(msg);
        this.name = 'WebRTC/InvalidArgumentError';
    }
}