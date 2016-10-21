'use strict';

const Command = require('cmnd').Command;
const UpCommand = require('./up.js');

class ReleaseCommand extends Command {

  constructor() {

    super('release');

  }

  help() {

    return {
      description: 'Pushes release of stdlib package to registry and cloud'
    };

  }

  run(params, callback) {

    params.flags.r = true;
    params.args = [];

    UpCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = ReleaseCommand;
