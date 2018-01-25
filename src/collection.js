class Collection {

  constructor(name, commands = []){
    this.name = name;
    this.commands = commands;
  }


  toJSONString(){
    return JSON.stringify(this, null, '  ');
   }

   get json() {
     // return JSON.stringify(this, null, '  ');
     return JSON.parse( JSON.stringify(this));
   }
}
