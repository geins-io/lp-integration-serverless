const util = require("../global/util.js");
// My Parsers
const { MyParser, FeedParser } = require('../global/parsers/');
module.exports = async function (context, item) {
    let origin = 'queue-trigger';
    if(item.origin){
        origin += `/${item.origin}`;
    }
    // get the queue message and process it
    let action = new util.Action(origin, item.action, item.payload);
    // log the action and payload
    util.logger.saveActionToLog(action);
    // process the action
    switch(action.familyAndAction()) {
        case "feed-generate":
            // add parser to the output and output to the action
            action.output.push(new util.Output(util.OutputType.STORE_SAVE, new FeedParser()));            
            break;
        default:
            // log error
            context.log('Invalid action -> ', action);            
            break;
    }
    // run action and catch any errors
    try {
        action.run();
    } catch (error) {
        // log the error
        context.log('Error -> ', error);
    }
    
};