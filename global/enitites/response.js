class Response {
    constructor(statusCode, body, headers) {
      this.statusCode = statusCode || 200;
      this.body = body || {};
      this.headers = headers || { 'Content-Type': 'application/json' };
    }
  
    static success(body, headers) {
      return new Response(200, body, headers);
    }
  
    static badRequest(body, headers) {
      return new Response(400, body, headers);
    }
  
    static unauthorized(body, headers) {
      return new Response(401, body, headers);
    }
  
    static notFound(body, headers) {
      return new Response(404, body, headers);
    }
  
    static internalServerError(body, headers) {
      return new Response(500, body, headers);
    }
  
    toAzureFunctionResponse() {
      return {
        status: this.statusCode,
        headers: this.headers,
        body: this.body,
      };
    }
  }
  
  module.exports = Response;
  