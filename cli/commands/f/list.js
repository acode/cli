'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const fs = require('fs');
const async = require('async');
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const tabler = require('../../tabler.js');

class FListCommand extends Command {

  constructor() {

    super('f', 'list');

  }

  help() {

    return {
      description: 'Lists your stdlib functions'
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

    let name = params.args[0];
    let obj = {};
    name && (obj.name = name);

    return resource.request('v1/functions').index(obj, (err, response) => {

      if (err) {
        return callback(err);
      }

      callback(null, tabler(['command', 'url'], response.data));

    });

  }

}

module.exports = FListCommand;
