export enum messages {
  NOT_STARTED_YET = 'The libp2p node is not started yet',
  DHT_DISABLED = 'DHT is not available',
  PUBSUB_DISABLED = 'PubSub is not available',
  CONN_ENCRYPTION_REQUIRED = 'At least one connection encryption module is required',
  ERR_TRANSPORTS_REQUIRED = 'At least one transport module is required',
  ERR_PROTECTOR_REQUIRED = 'Private network is enforced, but no protector was provided',
  NOT_FOUND = 'Not found'
}
