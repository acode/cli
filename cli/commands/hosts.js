'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');
const tabler = require('../tabler.js');

class HostsCommand extends Command {

  constructor() {

    super('hosts');

  }

  help() {

    return {
      description: 'Displays created hostname routes from source custom hostnames to target services you own'
    };

  }

  run(params, callback) {

    let host = 'api.polybit.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    resource.request('v1/hostname_routes').index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let fields = ['hostname', 'target', 'created_at'];
      let table = tabler(fields, response.data);

      console.log(table);

      return callback(null);

    });

  }

}

module.exports = HostsCommand;
