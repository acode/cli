'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../credentials.js');

const chalk = require('chalk');

class LogsCommand extends Command {

  constructor() {

    super('logs');

  }

  help() {

    return {
      description: 'Retrieves logs for a given service',
      args: ['service'],
      flags: {
        s: '<stream> The log stream you want to retrieve. Allowed values are "stdout" and "stderr"',
        n: '<number of lines> The number of log lines you want to retrieve',
        u: '<function> The specific function within the service that you want to retrieve logs from'
      },
      vflags: {
        stream: '<stream> The log stream you want to retrieve. Allowed values are "stdout" and "stderr"',
        num: '<number of lines> The number of log lines you want to retrieve',
        function: '<function> The specific function within the service that you want to retrieve logs from'
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

    let serviceName = params.args[0];

    if (!serviceName) {
      return callback(new Error('Please specify a service'));
    }

    // Allow dot syntax to be in line with other parts of CLI
    serviceName = serviceName.replace(/\./, '/');

    if (serviceName.split('/').length !== 2) {
      return callback(new Error('Please specify services as <username>/<service name>'));
    }

    let stream = params.flags.s || params.vflags.stream || 'stdout';
    let requestedLineCount = params.flags.n || params.vflags.num || 100;
    let functionName = params.flags.u || params.vflags.function;

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

    resource.request('v1/logs/data').index(queryParams, (err, result) => {

      if (err) {
        return callback(err);
      }

      let logs = result.data[0].logs.split('\n');
      logs.map((log) => {

        if (!log) {
          return;
        }

        let logComponents = log.split('\t');

        if (stream === 'stderr') {
          console.log(chalk.red(logComponents[0]) + '\t' + logComponents[1]);
        } else {
          console.log(chalk.green(logComponents[0]) + '\t' + logComponents[1]);
        }

      });

      return callback(null);

    });
  }

}

module.exports = LogsCommand;
