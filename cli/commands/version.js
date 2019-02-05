'use strict';

const Command = require('cmnd').Command;

class VersionCommand extends Command {

  constructor() {

    super('version');

  }

  help() {

    return {
      description: 'Returns currently installed version of Standard Librarycommand line tools'
    };

  }

  run(params, callback) {

    let pkg = require('../../package.json');
    callback(null, pkg.version);

  }

}

module.exports = VersionCommand;
