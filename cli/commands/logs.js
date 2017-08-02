'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const chalk = require('chalk');

const VALID_LOG_TYPES = ['stdout', 'stderr'];
const LOG_TYPE_COLORS = {
  'stdout': 'green',
  'stderr': 'red'
};

class LogsCommand extends Command {

  constructor() {

    super('logs');

  }

  help() {

    return {
      description: 'Retrieves logs for a given service',
      args: ['service'],
      flags: {
        t: 'The log type you want to retrieve. Allowed values are "stdout" and "stderr".',
        l: 'The number of log lines you want to retrieve'
      },
      vflags: {
        type: 'The log type you want to retrieve. Allowed values are "stdout" and "stderr".',
        lines: 'The number of log lines you want to retrieve'
      }
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

    let serviceName = params.args[0] || '';

    // Allow dot syntax to be in line with other parts of CLI
    serviceName = serviceName.replace(/\./, '/');

    if (serviceName.split('/').length !== 2) {
      return callback(new Error('Please specify a service as <username>.<service>'));
    }

    let logType = (params.flags.t || params.vflags.type || [])[0] || 'stdout';
    let lines = Math.max(parseInt((params.flags.l || params.vflags.lines || [])[0]) || 100, 1);

    if (VALID_LOG_TYPES.indexOf(logType) === -1) {
      return callback(new Error(`Log type must be one of: ${VALID_LOG_TYPES.join(', ')}`));
    }

    let queryParams = {
      service_name: serviceName,
      // log_type: logType,
      count: lines
    };

    let resource = new APIResource(host, port);
    resource.authorize(Credentials.read('ACCESS_TOKEN'));

    resource.request('v1/logs/read').index(queryParams, (err, results) => {

      if (err) {
        return callback(err);
      }

      return callback(null, results);

    });
  }

}

module.exports = LogsCommand;
