'use strict';

const Command = require('cmnd').Command;

const chalk = require('chalk');

class RegisterCommand extends Command {

  constructor() {

    super('register');

  }

  help() {

    return {
      description: 'Registers a new Autocode user account (deprecated)'
    };

  }

  run(params, callback) {

    console.log();
    console.log(`Creating new accounts through the terminal has been ${chalk.bold('deprecated')}.`);
    console.log(`Please create an account by going to "https://autocode.com/".`);
    console.log();
    console.log(`Once complete, use ${chalk.bold('lib init')} to initialize your workspace and use the CLI.`);
    console.log();

  }

}

module.exports = RegisterCommand;
