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

    params.flags.r = [];
    params.args = [];
    UpCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = ReleaseCommand;
