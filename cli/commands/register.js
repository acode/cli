'use strict';

const Command = require('cmnd').Command;

const chalk = require('chalk');

class RegisterCommand extends Command {

  constructor() {

    super('register');

  }

  help() {

    return {
      description: 'Registers a new Standard Library user account (deprecated)'
    };

  }

  run(params, callback) {

    console.log();
    console.log(`Creating new accounts through the terminal has been ${chalk.bold('deprecated')}.`);
    console.log(`Please create an account by going to "https://stdlib.com/".`);
    console.log();
    console.log(`Once complete, use ${chalk.bold('lib login')} to log in and use the CLI.`);
    console.log();

  }

}

module.exports = RegisterCommand;
