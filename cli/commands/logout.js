'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const async = require('async');

const config = require('../config.js');

class LogoutCommand extends Command {

  constructor() {

    super('logout');

  }

  help() {

    return {
      description: 'Logs out of Autocode in this workspace',
      flags: {
        'f': 'Force - clears information even if current Access Token invalid'
      },
      vflags: {
        'force': 'Force - clears information even if current Access Token invalid'
      }
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let force = !!(params.flags.f || params.vflags.force);

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    resource.request('v1/access_tokens').destroy(null, {}, (err, response) => {

      if (!force && err) {
        return callback(err);
      }

      config.set('ACCESS_TOKEN', '');
      config.set('ACTIVE_LIBRARY_TOKEN', '');
      config.unset('LIBRARY_TOKENS');
      config.write();
      return callback(null, 'Logged out successfully');

    });

  }

}

module.exports = LogoutCommand;
