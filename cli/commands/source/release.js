'use strict';

const Command = require('cmnd').Command;
const SourceUpCommand = require('./up.js');

class SourceReleaseCommand extends Command {

  constructor() {

    super('source', 'release');

  }

  help() {

    return {
      description: 'Pushes release of StdLib source code to registry and cloud (Alias of `lib source:up -r`)'
    };

  }

  run(params, callback) {

    params.flags.r = true;
    params.args = [];

    SourceUpCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = SourceReleaseCommand;
