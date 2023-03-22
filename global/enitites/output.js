const OutputType = Object.freeze({
    API_PUSH: 'apiPush',
    HTTP_RESPONSE: 'httpResponse',
    HTTP_REQUEST: 'httpRequest',
    PUSH: 'push',
    // Add other types as needed
  });
  
  class Output {
    constructor(type, parser, payload) {
      if (!Object.values(OutputType).includes(type)) {
        throw new Error(`Invalid output type: ${type}`);
      }
  
      this.type = type;
      this.parser = parser;
      this.payload = payload;
    }
  }
  
  module.exports = {
    Output,
    OutputType,
  };
  