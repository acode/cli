'use strict';

const Command = require('cmnd').Command;
const Registry = require('../registry.js');

const chalk = require('chalk');

const serviceConfig = require('../service_config');
const config = require('../config.js');

const RELEASE_ENV = 'release';

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

    let environment = params.args[0];
    let release = params.flags.r || params.vflags.release;
    let version = null;

    if (environment) {
      if (environment === RELEASE_ENV) {
        if (release[0]) {
          version = release[0];
        }
      } else if (release) {
        return callback(new Error('Can not release to an environment'));
      }
    } else if (release) {
      environment = RELEASE_ENV;
      if (release[0]) {
        version = release[0];
      }
    } else {
      return callback(new Error('Please specify an environment'));
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
    console.log();
    console.log(`Rebuilding ${chalk.bold(`${pkg.stdlib.name}@${environment === RELEASE_ENV ? version || pkg.stdlib.version : environment}`)} to Autocode at ${host}:${port}...`);

    let registryParams = {name: pkg.stdlib.name};
    if (environment !== RELEASE_ENV) {
      registryParams.environment = environment;
    } else {
      registryParams.version = version;
    }

    return registry.request(
      'rebuild',
      registryParams,
      null,
      (err, response) => {

        if (err) {
          console.log()
          return callback(err);
        } else {
          console.log()
          console.log(`${chalk.bold(`${response.name}@${response.environment || response.version}`)} rebuilt successfully!`);
          return callback(null);
        }

      },
      (data) => {
        console.log(`Registry :: ${data.message}`);
      }
    );

  }

}

module.exports = RebuildCommand;
