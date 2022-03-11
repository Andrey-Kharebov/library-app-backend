class HttpError extends Error {
  constructor(message, errorCode) {
    super(message) // Adds a 'message' property
    this.code = errorCode // Adds 'code' property
  }
}

module.exports = HttpError