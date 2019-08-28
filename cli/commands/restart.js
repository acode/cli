'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const fs = require('fs');
const path = require('path');

const config = require('../config.js');
const serviceConfig = require('../service_config');

class RestartCommand extends Command {

  constructor() {

    super('restart');

  }

  help() {

    return {
      description: 'Restarts a Standard Library service (if necessary)',
      args: [
        'environment'
      ],
      flags: {
        r: 'Restart a release package',
        b: 'Rebuild service fully'
      },
      vflags: {
        release: 'Restart a release package',
        build: 'Rebuild service fully'
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let version;
    let release = params.flags.r || params.vflags.release;
    let rebuild = params.flags.b || params.vflags.build;

    if (release && environment) {
      return callback(new Error('Can not reset a release with an environment'));
    }

    if (!release && !environment) {
      return callback(new Error('Please specify an environment'));
    }

    if (release) {
      version = release[0];
      environment = null;
    }

    let host = 'registry.stdlib.com';
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

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    let endpoint = environment
      ? `${pkg.stdlib.name}@${environment}`
      : `${pkg.stdlib.name}@${version || pkg.stdlib.version}`;

    return resource.request(`${endpoint}/${rebuild ? 'rebuild' : 'restart'}`).stream(
      'PUT',
      null,
      (data) => {
        data.length > 1 && process.stdout.write(data.toString());
      },
      (err, response) => {

        if (err) {
          return callback(err);
        }

        if (response[response.length - 1] === 1) {
          return callback(new Error('There was an error processing your request, try logging in again.'));
        } else {
          return callback(null);
        }

      }
    );

  }

}

module.exports = RestartCommand;
