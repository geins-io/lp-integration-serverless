const util = require("../global/util.js");
module.exports = async function (context, req) {
    // set default response
    let response = util.Response.unauthorized();
    // get origin from context user-Agent
    const origin = context.req.headers['user-agent'];
    // get action and payload from query string or body
    const action = (req.query.action || req.body && req.body.action);
    const payload = (req.query.payload || req.body && req.body.payload); 
    const object = { action: action, payload: payload };
    //log request
    util.logger.saveLog(origin, action, object);
    // validate action and payload
    if (!action || !payload) {
        response = util.Response.badRequest("action and payload are required");
        context.res = response;
        return;
    }
    var retval = {};
    // **************************************
    // *********** LOGIC GOES HERE **********
    // **************************************
    response = util.Response.success(retval);
    // return response
    context.res = response;
}