const util = require("../global/util.js");
module.exports = async function (context, req) {
    // set default response
    let response = util.Response.unauthorized();
    // get origin from request headers ["X-Forwarded-Client-Ip"]
    let origin = context.bindingData.sys.methodName;    
    if(req.headers["X-Forwarded-Client-Ip"]) {
        origin += `/${req.headers["X-Forwarded-Client-Ip"]}`;
    }    
    // get action and payload from query string or body
    const action = (req.query.action || req.body && req.body.action);
    const payload = (req.query.payload || req.body && req.body.payload); 
    const object = { action: action, payload: payload, origin: origin };
    //log request
    util.logger.saveLog(origin, action, object);
    // validate action and payload
    if (!action || !payload) {
        response = util.Response.badRequest("action and payload are required");
        context.res = response;
        return;
    }
    // put in queue
    //util.queue.enqueueMessage(object);

    console.log('***** PAYLOAD', payload);

    //const klavyioClient = new util.KlavyioAPI();
    //const retval = await klavyioClient.getProfileFromEmail(payload);

    const mgmtClient = new util.MgmtAPI();
    //console.log('***** mgmtClient', mgmtClient);
    const retval = await mgmtClient.getCategory(19);
    


    console.log('***** RETVAL', retval);
    response = util.Response.success(retval);

    // set success response    
    // response = util.Response.success();
    
    // return response
    context.res = response;
}