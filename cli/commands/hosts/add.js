'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const config = require('../../config.js');

class HostsAddCommand extends Command {

  constructor() {

    super('hosts', 'add');

  }

  help() {

    return {
      description: 'Adds a new hostname route from a source custom hostname to a target service you own',
      args: [
        'source',
        'target'
      ]
    };

  }

  run(params, callback) {

    let host = 'api.polybit.com';
    let port = 443;

    let source = params.args[0] || '';
    let target = params.args[1] || '';

    let versionString = target.split('[@')[1];
    versionString = versionString && versionString.replace(']', '');
    let service = target.split('[@')[0];
    let urlComponentArray = [service.split('.')[1], service.split('.')[0], 'lib.id'];

    if (versionString) {
      versionString = versionString.split('.').join('-');
      urlComponentArray.unshift(versionString);
    }

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    resource.request('v1/hostname_routes').create({}, {
      hostname: source,
      target: urlComponentArray.join('.')
    }, (err, response) => {

      if (err) {
        return callback(err);
      }

      return callback(null, `Successfully added hostname route from "${source}" to "${target}"!`);

    });

  }

}

module.exports = HostsAddCommand;
