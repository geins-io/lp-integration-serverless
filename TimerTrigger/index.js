const util = require("../global/util.js");
module.exports = async function (context, myTimer) {    
    var timeStamp = new Date().toISOString();
    // sample object for log and queue
    const object = { action: 'family-action', payload: 'payload', origin: 'timer-trigger' };        
    // Log request
    // util.logger.saveLog('timer-trigger', object.action, object);
    // Put in queue
    // util.queue.enqueueMessage(object);
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