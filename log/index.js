const util = require("../global/util.js");
module.exports = async function (context, req) {
    // set default response
    let response = util.Response.unauthorized();
    // get origin from query string or body
    const origin = (req.query.origin || req.body && req.body.origin);
    // get action from query string or body
    const action = (req.query.action || req.body && req.body.action);
    // get action and payload from query string or body
    try {
        const logs = await util.logger.fetchLogs({ origin: origin, action: action });
        response = util.Response.success(logs);
    } catch (error) {
        // return error response in devlopenment
        if(util.environment === "development") {
            response = util.Response.internalServerError(error);

        } else {
            response = util.Response.unauthorized();
        } 
    }
    // return response           
    context.res = response;
}