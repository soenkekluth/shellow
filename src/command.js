class Command {
  constructor(name, command) {
    this.name = name;
    this.command = command;
  }

  toJSONString(){
   return JSON.stringify(this, null, '  ');
  }

  get json() {
    // return JSON.stringify(this, null, '  ');
    return JSON.parse( JSON.stringify(this));
  }
}

module.exports = Command;
