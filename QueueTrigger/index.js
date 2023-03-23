const util = require("../global/util.js");
module.exports = async function (context, item) {
    // get the queue message and process it
    const action = new util.Action('queueTrigger', item.action, item.payload);
    // log the action and payload
    if(util.environment === "development") {
        context.log('Action -> ', action.action);
        context.log('Action Family -> ', action.family);
        context.log('Payload -> ', action.payload);
    }    
    util.logger.saveActionToLog(action);
    // process the action
    switch(action) {
        case "user-sync":
            // create a new record
            break;
        case "user-sync":
            // update an existing record
            break;
        case "user-delete":
            // delete an existing record
            break;
        default:
            // log the error
            context.log('Invalid action -> ', action);
            util.logger.saveLog('Invalid action -> ', action);
            break;
    }

};