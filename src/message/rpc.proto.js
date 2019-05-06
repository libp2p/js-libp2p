'use strict'
module.exports = `
message RPC {
  repeated SubOpts subscriptions = 1;
  repeated Message msgs = 2;

  message SubOpts {
    optional bool subscribe = 1; // subscribe or unsubcribe
    optional string topicID = 2;
  }

  message Message {
    optional bytes from = 1;
    optional bytes data = 2;
    optional bytes seqno = 3;
    repeated string topicIDs = 4;
    optional bytes signature = 5;
    optional bytes key = 6;
  }
}`
