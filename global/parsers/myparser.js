class MyParser {
    constructor() {
    }

    parse(output, action) {
        // parse the output type and process it
        switch(output.type) {
            case "apiPush":
                this.pushToApi(action);
                break;
        }
    }

    pushToApi(actionObject) {
        // push the action to the api
        const payload = actionObject.payload;
        const family = actionObject.family;
        const action = actionObject.action;
        console.log('*** PUSH TO API  -> ', actionObject);
    }
}
module.exports = MyParser

  