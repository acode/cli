'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const config = require('../../config.js');
const tabler = require('../../tabler.js');

class HostnamesListCommand extends Command {

  constructor() {

    super('hostnames', 'list');

  }

  help() {

    return {
      description: 'Displays created hostname routes from source custom hostnames to target services you own'
    };

  }

  run(params, callback) {

    let host = 'api.autocode.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);
    let JSONoutput = params.flags.hasOwnProperty('j') || params.vflags.hasOwnProperty('json');

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

      if (JSONoutput) {
        return callback(null, response.data);
      }

      let fields = ['Hostname', 'Target', 'Created At'];

      return callback(null, tabler(fields, response.data.map((hostnameRoute) => {
        return {
          Hostname: hostnameRoute.formatted_hostname,
          Target: hostnameRoute.target,
          'Created At': hostnameRoute.created_at
        };
      }), true) + '\n');

    });

  }

}

module.exports = HostnamesListCommand;
