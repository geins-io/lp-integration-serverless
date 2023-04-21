const util = require("../global/util.js");
// My Parsers
const { KlavyioParser } = require('../global/parsers/');
module.exports = async function (context, item) {
    let origin = 'queue-trigger';
    if(item.origin){
        origin += `/${item.origin}`;
    }
    // get the queue message and process it
    let action = new util.Action(origin, item.action, item.payload);
    // log the action and payload
    // util.logger.saveActionToLog(action);
    // process the action
    switch(action.familyAndAction()) {
        case "user-sync":
        case "users-sync": 
        case "product-sync":
        case "products-sync":           
            action.output.push(new util.Output(util.OutputType.API_PUSH, new KlavyioParser()));            
            break;
        default:
            // log error
            context.log('Invalid action:', action);            
            break;
    }
    // run action and catch any errors
    try {
        action.run();
    } catch (error) {
        // log the error
        context.log('Error in "run()":', error);
    }
    
};