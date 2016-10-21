'use strict';

const Command = require('cmnd').Command;
const RestartCommand = require('./restart.js');

class RebuildCommand extends Command {

  constructor() {

    super('rebuild');

  }

  help() {

    return {
      description: 'Rebuilds a service (useful for registry performance updates), alias of stdlib restart -b',
      args: [
        'environment'
      ],
      flags: {
        r: 'Rebuild a release package'
      },
      vflags: {
        release: 'Rebuild a release package'
      }
    };

  }

  run(params, callback) {

    params.flags.b = [];

    RestartCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = RebuildCommand;
