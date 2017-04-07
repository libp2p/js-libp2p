'use strict'

class InvalidRecordError extends Error {}

class NotFoundError extends Error {}

class LookupFailureError extends Error {}

module.exports = {
  InvalidRecordError,
  NotFoundError,
  LookupFailureError
}
