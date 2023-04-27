const util = require("../global/util.js");
var KlaviyoSdk = require('klaviyo-api');
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

    // TEST TEST ------------------------------

    const fieldsProfile = ["email"]
    const fieldsList = ["name"]

    // --------------------------------------
    
    var profileId = "01GJAZVKHNEKK5CRHXR0FBP9W4";
    var opts = {};

    const klavyioClient = new util.KlavyioAPI();
   // const retval =  await klavyioClient.getProfile(profileId, opts);
    const retval =  await klavyioClient.getProfiles(opts);



    // **************************************
    // *********** LOGIC GOES HERE **********
    // **************************************
    
    response = util.Response.success(retval);
    // return response
    context.res = response;
}