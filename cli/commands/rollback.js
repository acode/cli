'use strict';

const Command = require('cmnd').Command;
const DownCommand = require('./down.js');

class RollbackCommand extends Command {

  constructor() {

    super('rollback');

  }

  help() {

    return {
      description: 'Rolls back (removes) release of StdLib package (alias of `lib down -r`)'
    };

  }

  run(params, callback) {

    params.flags.r = params.args[0];
    params.args = [];

    DownCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = RollbackCommand;
