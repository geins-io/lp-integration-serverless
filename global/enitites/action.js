class Action {
  constructor(origin, action, payload) {
    if(!action) throw new Error("Action is required");
    if(!origin) throw new Error("Origin is required");
    if(!output) throw new Error("Output is required");
    if(!payload) throw new Error("Payload is required");
    const splitOnHyphen = function(str) {
      return str.split("-");
    }
    // set the action and family
    if(action.includes("-")) {
      const split = splitOnHyphen(action);
      this.action = split[0];
      this.family = split[1];
    } else {        
      this.action = action;
      this.family = '';
    }      
    this.origin = origin;
    this.output = {};
    this.payload = payload;
  }
}

module.exports = Action;
