'use strict';

const fs = require('fs');
const path = require('path');

const Command = require('cmnd').Command;

const chalk = require('chalk');

class SourceSelfCommand extends Command {

  constructor() {

    super('source', 'self');

  }

lib source:self

  help() {

    return {
      description: 'Converts a local service to StdLib sourcecode by creating "source.json"',
      args: [],
      flags: {},
      vflags: {}
    };

  }

  run(params, callback) {

    let pkg;

    try {
      pkg = require(path.join(process.cwd(), 'package.json'));
    } catch(e) {
      return callback(new Error('Invalid package.json'));
    }

    if (!pkg.stdlib) {
      return callback(new Error('No stdlib information set in "package.json"'));
    }

    if (!pkg.stdlib.name) {
      return callback(new Error('No stdlib name set in "package.json"'));
    }

    if (fs.existsSync('source.json')) {
      return callback(new Error('This directory already has a source.json'))
    }

    let json = {
      source: require(path.join(__dirname, `../../templates/source.json`))
    };

    let sourceName = `@${pkg.stdlib.name}`;

    json.source.name = sourceName;
    fs.writeFileSync('source.json', JSON.stringify(json.source, null, 2));

    console.log(chalk.bold.green('Success!'));
    console.log();
    console.log(`This service has been converted to source "${chalk.bold(sourceName)}"`);
    return callback(null);

  }

}

module.exports = SourceSelfCommand;
