const util = require("../global/util.js");
module.exports = async function (context, item) {
    // get the queue message and process it
    const action = item.action;
    const payload = item.payload;
    // log the action and payload
    if(util.environment === "development") {
        context.log('Action -> ', action);
        context.log('Payload -> ', payload);
    }
};