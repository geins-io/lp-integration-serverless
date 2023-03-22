const util = require("../global/util.js");
module.exports = async function (context, myTimer) {    
    var timeStamp = new Date().toISOString();
    // sample object for log and queue
    const object = { action: 'action', payload: 'payload' };        
    //log request
    util.logger.saveLog('trigger', object.action, object);
    // put in queue
    util.queue.enqueueMessage(object);
    if (myTimer.isPastDue)
    {
        if(util.environment === "development") {
            context.log('JavaScript timer is running late', timeStamp);   
        }
    }
    if(util.environment === "development") {
        context.log('JavaScript timer trigger function ran!', timeStamp);   
    }
};