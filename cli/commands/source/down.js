'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');

const fs = require('fs');
const path = require('path');

class SourceDownCommand extends Command {

  constructor() {

    super('source', 'down');

  }

  help() {

    return {
      description: 'Removes StdLib source code from the registry and cloud environments',
      args: [
        'environment'
      ],
      flags: {
        r: 'Removes a release version (provide number)',
      },
      vflags: {
        release: 'Removes a release version (provide number)',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let release = params.flags.r || params.vflags.release;
    let version;

    if (release) {
      version = release[0];
      environment = null;
    }

    if (release && environment) {
      return callback(new Error('Can not remove a release with an environment'));
    }

    if (!release && !environment) {
      return callback(new Error('Please specify an environment'));
    }

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    let host = 'registry.stdlib.com';
    let port = 443;

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
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    let endpoint = environment ?
      `sources/${pkg.stdlib.name}@${environment}` :
      `sources/${pkg.stdlib.name}@${version || pkg.version}`;

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
          return callback(new Error('There was an error processing your request'));
        } else {
          return callback(null);
        }

      }

    );

  }

}

module.exports = SourceDownCommand;
