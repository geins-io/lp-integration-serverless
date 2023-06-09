class Action {
  constructor(origin, action, payload) {    
    if(!origin) throw new Error("Origin is required");
    if(!action) throw new Error("Action is required");
    if(!payload) throw new Error("Payload is required");
    // set the action and family
    if(action.includes("-")) {
      const split = action.split("-");
      this.action = split[1];
      this.family = split[0];
    } else {              
      this.action = action;
      this.family = '';
    } 
        
    this.origin = origin;
    this.output = [];
    this.payload = payload;
  }
  familyAndAction() {
    return `${this.family}-${this.action}`;
  }
  run() {
    if(!this.output.length) throw new Error("Action is required");
    // loop through the output and process it
    this.output.forEach(output => {
      output.parser.parse(output, this);
    });

  }
    
}

module.exports = Action;
