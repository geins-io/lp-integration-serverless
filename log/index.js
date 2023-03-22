const util = require("../global/util.js");
module.exports = async function (context, req) {

    let responseMessage = "Hello, World!";
    let message = { data: 'some queue data' };

    // util.logger.saveLog("origin1", "action1", { data: 'some data' });    
    // util.queue.enqueueMessage(message);
 /*   util.logger.fetchLogs({ origin: "origin1", action: "action1" })
        .then(logs => context.log(logs))
        .catch(error => context.error(error));*/
    
    try {
        const logs = await util.logger.fetchLogs({ origin: "origin1", action: "action1" });
        context.log(logs);
        responseMessage += logs;

    } catch (error) {
        context.log(error);
    }   
        
    context.res = {
        body: responseMessage
    };
}