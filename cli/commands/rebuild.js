'use strict';

const Command = require('cmnd').Command;

class RebuildCommand extends Command {

  constructor() {

    super('rebuild');

  }

  help() {

    return {
      description: 'Rebuilds a service (useful for registry performance updates), alias of `lib restart -b`',
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

    // do a thing

  }

}

module.exports = RebuildCommand;
