'use strict';

const Command = require('cmnd').Command;
const UpCommand = require('./up.js');

const fs = require('fs');
const inquirer = require('inquirer');

class ReleaseCommand extends Command {

  constructor() {

    super('release');

  }

  help() {

    return {
      description: 'Pushes release of Autocode package to registry and cloud (Alias of `lib up -r`)'
    };

  }

  run(params, callback) {

    params.flags.r = true;
    params.args = [];

    if (fs.existsSync('source.json')) {

      console.log();
      console.log('You\'re calling lib release in a directory with a source.json file');
      console.log();

      inquirer.prompt([{
        name: 'continue',
        message: 'Do you want to continue?',
        type: 'confirm'}], (answer) => {

        if (!answer.continue) {
          process.exit();
        }

        UpCommand.prototype.run.call(this, params, callback);

      });

    } else {

      UpCommand.prototype.run.call(this, params, callback);

    }

  }

}

module.exports = ReleaseCommand;
