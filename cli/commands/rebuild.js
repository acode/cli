'use strict';

const Command = require('cmnd').Command;
const RestartCommand = require('./restart.js');

class RebuildCommand extends Command {

  constructor() {

    super('rebuild');

  }

  help() {

    return {
      description: 'Rebuilds a service (useful for registry performance updates)'
    };

  }

  run(params, callback) {

    params.flags.b = [];

    RestartCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = RebuildCommand;
