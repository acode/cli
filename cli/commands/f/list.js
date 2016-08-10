'use strict';

const Command = require('cmnd').Command;
const path = require('path');
const fs = require('fs');
const async = require('async');
const APIResource = require('api-res');
const table = require('text-table');
const Credentials = require('../../credentials.js');

class FListCommand extends Command {

  constructor() {

    super('f', 'list');

  }

  help() {

    return {
      description: 'List your functions'
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

    return resource.request('v1/functions').index({}, (err, response) => {
      if (err) {
        return callback(err);
      }

      if (response.data.length === 0) {
        return callback(null, 'You have no functions yet.' +
          ' Run stdlib f:new to create your first function');
      }

      const functions = response.data.map(v => [`f ${v.command}`, v.url]);
      functions.unshift(['Command', 'HTTPS (POST)']);

      const result = table(functions);

      callback(null, result);
    });
  }
}

module.exports = FListCommand;
