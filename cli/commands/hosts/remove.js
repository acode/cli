'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const config = require('../../config.js');

class HostsRemoveCommand extends Command {

  constructor() {

    super('hosts', 'remove');

  }

  help() {

    return {
      description: 'Removes a hostname route from a source custom hostname to a target service you own',
      args: [
        'source'
      ]
    };

  }

  run(params, callback) {

    let host = 'api.polybit.com';
    let port = 443;

    let source = params.args[0] || '';

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    resource.request('v1/hostname_routes').index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let route = response.data.filter((route) => {
        return route.hostname === source;
      });

      if (!route.length) {
        return callback(new Error(`No routes found matching "${source}"`))
      }

      resource.request(`v1/hostname_routes`).destroy(route[0].id, {}, (err, response) => {

        if (err) {
          return callback(err);
        }

        return callback(null, `Successfully removed hostname route from "${source}"!`);

      });

    });

  }

}

module.exports = HostsRemoveCommand;
