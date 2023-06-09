const OutputType = Object.freeze({
  API_PUSH: 'apiPush',
  HTTP_RESPONSE: 'httpResponse',
  HTTP_REQUEST: 'httpRequest',
  PUSH: 'push',
  STORE_SAVE: 'storeSave',
  STORE_GET: 'storeGet',
  // Add other types as needed
});

class Output {
  constructor(type, parser) {
    if (!Object.values(OutputType).includes(type)) {
      throw new Error(`Invalid output type: ${type}`);
    }
    this.type = type;
    this.parser = parser;
  }
}

module.exports = {
  Output,
  OutputType,
};
