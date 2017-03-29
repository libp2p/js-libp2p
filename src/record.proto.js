'use strict'
module.exports = `// Record represents a dht record that contains a value
// for a key value pair
message Record {
  // The key that references this record
  // adjusted for j
  optional bytes key = 1;

  // The actual value this record is storing
  optional bytes value = 2;

  // hash of the authors public key
  // converted to bytes for JavaScript
  optional bytes author = 3;

  // A PKI signature for the key+value+author
  optional bytes signature = 4;

  // Time the record was received, set by receiver
  optional string timeReceived = 5;
}`
