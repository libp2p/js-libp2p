'use strict'
module.exports = `
// topicCID = cid(merkledag_protobuf(topicDescriptor)); (not the topic.name)
message TopicDescriptor {
  optional string name = 1;
  optional AuthOpts auth = 2;
  optional EncOpts enc = 2;

  message AuthOpts {
    optional AuthMode mode = 1;
    repeated bytes keys = 2; // root keys to trust

    enum AuthMode {
      NONE = 0; // no authentication, anyone can publish
      KEY = 1; // only messages signed by keys in the topic descriptor are accepted
      WOT = 2; // web of trust, certificates can allow publisher set to grow
    }
  }

  message EncOpts {
    optional EncMode mode = 1;
    repeated bytes keyHashes = 2; // the hashes of the shared keys used (salted)

    enum EncMode {
      NONE = 0; // no encryption, anyone can read
      SHAREDKEY = 1; // messages are encrypted with shared key
      WOT = 2; // web of trust, certificates can allow publisher set to grow
    }
  }
}`
