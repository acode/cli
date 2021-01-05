'use strict';

const Command = require('cmnd').Command;
const Registry = require('../registry.js');

const chalk = require('chalk');

const config = require('../config.js');
const serviceConfig = require('../service_config');

class DownCommand extends Command {

  constructor() {

    super('down');

  }

  help() {

    return {
      description: 'Removes Autocode package from registry and cloud environment',
      args: [
        'environment'
      ],
      flags: {
        r: 'Remove a release version (provide number)',
      },
      vflags: {
        release: 'Remove a release version (provide number)',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let version;
    let release = params.flags.r || params.vflags.release;

    if (release && environment) {
      return callback(new Error('Can not remove an release with an environment'));
    }

    if (!release && !environment) {
      return callback(new Error('Please specify an environment'));
    }

    if (release) {
      version = release[0];
      environment = null;
    }

    let host = 'packages.stdlib.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let pkg;

    try {
      pkg = serviceConfig.get();
    } catch(err) {
      return callback(err);
    }

    let registry = new Registry(host, port, config.get('ACCESS_TOKEN'));

    let registryParams = {name: pkg.stdlib.name};
    if (environment) {
      registryParams.environment = environment;
    } else {
      registryParams.version = version;
    }

    return registry.request(
      'down',
      registryParams,
      null,
      (err, response) => {

        if (err) {
          return callback(err);
        } else {
          console.log(`${chalk.bold(`${response.name}@${response.environment || response.version}`)} torn down successfully!`);
          return callback(null);
        }

      }
    );

  }

}

module.exports = DownCommand;
