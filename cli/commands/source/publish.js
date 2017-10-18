'use strict';

const Command = require('cmnd').Command;
const SourceDraftCommand = require('./draft.js');

class SourcePublishCommand extends Command {

  constructor() {

    super('source', 'publish');

  }

  help() {

    return {
      description: 'Publishes a versioned release of StdLib sourcecode to registry (alias of `lib source:draft -p`)'
    };

  }

  run(params, callback) {

    params.flags.p = true;
    params.args = [];

    SourceDraftCommand.prototype.run.call(this, params, callback);

  }

}

module.exports = SourcePublishCommand;
