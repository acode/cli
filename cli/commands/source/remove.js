'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const fs = require('fs');
const path = require('path');

const config = require('../../config.js');

class SourceRemoveCommand extends Command {

  constructor() {

    super('source', 'remove');

  }

  help() {

    return {
      description: 'Removes StdLib sourcecode from the registry',
      args: [
        'environment'
      ],
      flags: {
        p: 'Removes a published release version (provide number)',
      },
      vflags: {
        publish: 'Removes a published release version (provide number)',
      }
    };

  }

  run(params, callback) {

    let environment = params.args[0];
    let publish = params.flags.p || params.vflags.publish;
    let version;

    if (publish) {
      version = publish[0];
      environment = null;
    }

    if (publish && environment) {
      return callback(new Error('Can not remove a published release with an environment'));
    }

    if (!publish && !environment) {
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

    let source;

    try {
      source = require(path.join(process.cwd(), 'source.json'));
    } catch(e) {
      return callback(new Error('Invalid source.json'));
    }

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    let endpoint = environment ?
      `~src/${source.name}/${environment}` :
      `~src/${source.name}/${version || source.version}`;

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

module.exports = SourceRemoveCommand;
