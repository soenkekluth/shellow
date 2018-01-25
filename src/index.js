#!/usr/bin/env node

const program = require('commander');
const Conf = require('conf');
const envPaths = require('env-paths');
// const shell = require('shelljs');
const updateNotifier = require('update-notifier');
const inquirer = require('inquirer');
inquirer.registerPrompt(
  'autocomplete',
  require('inquirer-autocomplete-prompt')
);
const clipboardy = require('clipboardy');
const { exec } = require('child_process');
var _ = require('lodash');
var fuzzy = require('fuzzy');
const Collection = require('./collection');

const pkg = require('../package.json');
updateNotifier({ pkg }).notify();

const shell = cmd =>
  new Promise((resolve, reject) => {
    let out = '';
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        resolve(error);
        return;
      }

      if (stderr) {
        out = stderr;
      }
      resolve(out + stdout);
    });
  });

const config = new Conf();

if (!config.get('collections')) {
  config.set('collections', { default: [] });
}
if (!config.get('commands')) {
  config.set('commands', []);
}

const collections = config.get('collections');
// const commands = config.get('commands');

const collectionNames = Object.keys(collections);
// let commandNames = [];
let commands = [];

for (let i = 0, l = collectionNames.length; i < l; i++) {
  commands = commands.concat(collections[collectionNames[i]]);
  // commandNames = commandNames.concat(collections[collectionNames[i]].map(command => command.name))
}

// for (const col of collections) {
//   console.log('col', col);

// }

// for (const col in collections) {
//   if (collections.hasOwnProperty(col)) {
//     commandNames.concat(col.map(command => command.name));
//   }
// }

// console.log('commands', commands);
// console.log('collections', collections);
// console.log('collectionNames', collectionNames);
// console.log('commandNames', commandNames);
// process.exit(0);

// const collections = Object.keys(config.get('collections')).map(name => new Collection(name));
var options = {
  extract: function(el) {
    return el.name;
  },
};

function searchCommand(answers, input) {
  input = input || '';
  return new Promise(function(resolve) {
    setTimeout(function() {
      var fuzzyResult = fuzzy.filter(input, commands, options);
      resolve(
        fuzzyResult.map(function(el) {
          return el.string;
        })
      );
    }, _.random(30, 500));
  });
}

const execCommand = () =>
  inquirer
    .prompt([
      // {
      //   type: 'editor',
      //   name: 'comm',
      //   message: '>',
      // },
      {
        type: 'autocomplete',
        name: 'commandName',
        message: 'run: ',
        source: function(answers, input) {
          return searchCommand(answers, input);
        },
        // validate: function(val) {
        //   return val
        //     ? true
        //     : 'Type something!';
        // }
      },
    ])
    .then(answers => {
      // console.log('lol', lol);
      const command = commands.filter(c => c.name === answers.commandName)[0];

      return shell(command.command)
        .then(e => {
          console.log(e);
        })
        .catch(e => {
          console.error(e);
          process.exit(1);
        });

      // console.log('command', command);
      // shell.echo(command.command);
      // if (shell.exec(command.command).code !== 0) {
      //   shell.echo('Error: failed');
      //   shell.exit(1);
      // }
    });

const getAction = () =>
  inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'choose action',
      choices: ['add command', 'remove command'],
      filter: function(val) {
        return val.toLowerCase();
      },
    },
    //REMOVE
    {
      type: 'autocomplete',
      name: 'commandName',
      message: 'Please enter a command name:',
      source: function(answers, input) {
        return searchCommand(answers, input);
      },
      when: function(answers) {
        return answers.action === 'remove command';
      },
    },
    //ADD
    {
      type: 'input',
      name: 'commandName',
      message: 'Please enter a command name:',
      validate: function(value) {
        return !!value || 'Please enter a value';
      },
      when: function(answers) {
        return answers.action === 'add command';
      },
    },
    {
      type: 'input',
      name: 'command',
      message: 'Please enter the command to execute:',
      default: clipboardy.readSync(),
      when: function(answers) {
        return answers.action === 'add command';
      },
    },

    {
      type: 'confirm',
      name: 'addToCollection',
      message: 'add to collection?',
      default: false,
      when: function(answers) {
        return answers.action === 'add command';
      },
    },
    {
      type: 'list',
      name: 'collection',
      message: 'Please select the collection:',
      choices: ['CREATE NEW COLLECTION'].concat(collectionNames),
      default: 'default',
      when: function(answers) {
        return answers.addToCollection === true;
      },
    },
    {
      type: 'input',
      name: 'collectionName',
      message: 'Please enter a collection name:',
      validate: function(value) {
        return !!value || 'Please enter a value';
      },
      when: function(answers) {
        return answers.collection === 'CREATE NEW COLLECTION';
      },
    },
  ]);

const addCommand = ({ collectionName = 'default', commandName, command }) => {
  // const collectionName = answers.collectionName || 'default';
  (collections[collectionName] || (collections[collectionName] = [])).push({
    name: commandName,
    command: command,
  });
  config.set('collections.' + collectionName, collections[collectionName]);
};

const removeCommand = ({ collectionName = 'default', commandName }) => {
  if (collections[collectionName]) {
    collections[collectionName].splice(
      collections[collectionName].indexOf(commandName) >>> 0,
      1
    );
    config.set('collections.' + collectionName, collections[collectionName]);
  }
};

program.version('0.0.1').description('contact management system');

program
  .command('add')
  .alias('a')
  .description('Add a command')
  .action(() => {
    // prompt(questions).then(answers => addContact(answers));
    getAction().then(answers => {
      console.log(JSON.stringify(answers, null, '  '));

      if (answers.action === 'add command') {
        addCommand(answers);
      }
    });
  });

program
  .command('list')
  .alias('l')
  .description('List commands')
  .action(() => {
    console.log(JSON.stringify(config.get('collections'), null, '  '));
  });

program
  .command('updateContact <_id>')
  .alias('u')
  .description('Update contact')
  .action(_id => {
    prompt(questions).then(answers => updateContact(_id, answers));
  });

program
  .command('run <_name>')
  .alias('r')
  .description('run command')
  .action(_name => {
    const command = commands.filter(c => c.name === _name)[0];

    return shell(command.command)
      .then(e => {
        console.log(e);
      })
      .catch(e => {
        console.error(e);
        process.exit(1);
      });
  });

if (!process.argv.slice(2).length || !/[alre]/.test(process.argv.slice(2))) {
  execCommand();
  // program.outputHelp();
  // process.exit();
}

program.parse(process.argv);
