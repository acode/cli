'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const chalk = require('chalk');

const VALID_STREAMS = ['stdout', 'stderr'];
const STREAM_COLORS = {
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
        s: 'The log stream you want to retrieve. Allowed values are "stdout" and "stderr"',
        n: 'The number of log lines you want to retrieve',
        u: 'The specific function within the service that you want to retrieve logs from'
      },
      vflags: {
        stream: 'The log stream you want to retrieve. Allowed values are "stdout" and "stderr"',
        num: 'The number of log lines you want to retrieve',
        function: 'The specific function within the service that you want to retrieve logs from'
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

    let stream = (params.flags.s || params.vflags.stream || [])[0] || 'stdout';
    let requestedLineCount = Math.max(parseInt((params.flags.n || params.vflags.num || [])[0]) || 100, 1);
    let functionName = (params.flags.u || params.vflags.function || [])[0];

    if (VALID_STREAMS.indexOf(stream) === -1) {
      return callback(new Error(`Stream must be one of: ${VALID_STREAMS.join(', ')}`));
    }

    let queryParams = {
      service_name: serviceName,
      stream: stream,
      count: requestedLineCount
    };

    if (functionName) {
      queryParams.function_name = functionName;
    }

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
