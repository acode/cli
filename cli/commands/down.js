'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const config = require('../config.js');

const fs = require('fs');
const path = require('path');

class DownCommand extends Command {

  constructor() {

    super('down');

  }

  help() {

    return {
      description: 'Removes StdLib package from registry and cloud environment',
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

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    let endpoint = environment ?
      `${pkg.stdlib.name}@${environment}` :
      `${pkg.stdlib.name}@${version || pkg.version}`;

    return resource.request(endpoint).stream(
      'DELETE',
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

module.exports = DownCommand;
