'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');

const chalk = require('chalk');

const config = require('../config.js');

const VALID_LOG_TYPES = ['stdout', 'stderr'];
const LOG_TYPE_COLORS = {
  'stdout': 'grey',
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

    let host = 'api.autocode.com';
    let port = 443;

    let hostname = (params.flags.h && params.flags.h[0]) || '';
    let matches = hostname.match(/^(https?:\/\/)?(.*?)(:\d+)?$/);

    if (hostname && matches) {
      host = matches[2];
      port = parseInt((matches[3] || '').substr(1) || (hostname.indexOf('https') === 0 ? 443 : 80));
    }

    let logType = (params.flags.t || params.vflags.type || [])[0];
    let lines = Math.max(parseInt((params.flags.l || params.vflags.lines || [])[0]) || 100, 1);

    let queryParams = {
      count: lines
    };

    if (logType) {
      if (VALID_LOG_TYPES.indexOf(logType) === -1) {
        return callback(new Error(`Log type must be one of: ${VALID_LOG_TYPES.join(', ')}`));
      } else {
        queryParams.log_type = logType;
      }
    }

    let serviceFilter = params.args[0];
    if (!serviceFilter) {
      return callback(new Error('Please enter a service to check logs for in the format: username.service[@environment].*'));
    }
    
    let wildcard = serviceFilter && serviceFilter[serviceFilter.length - 1] === '*';
    if (wildcard) {
      serviceFilter = serviceFilter.substr(0, serviceFilter.length -1);
      if (['.', ']'].indexOf(serviceFilter[serviceFilter.length - 1]) === -1) {
        return callback(new Error('Sorry, can not wildcard incomplete service or function names'));
      }
    }

    let serviceParts = (serviceFilter || '').split('.');
    let username = serviceParts[0];
    let service = serviceParts[1];
    let pathname = serviceParts.slice(1).join('.');
    if (pathname) {
      let env = /^(.+?)\[@(.+?)\](?:\.(.*?))?$/.exec(pathname);
      if (env) {
        service = env[1];
        let environment = env[2];
        let functionName = env[3] || '';
        if (/^\d+/.exec(environment)) {
          queryParams.version = environment;
        } else {
          queryParams.environment = environment;
        }
        if (!wildcard || functionName) {
          queryParams.function_name = functionName.split('.').join('/');
        }
      }
    }
    queryParams.service_name = [username, service].join('/');

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    resource.request('v1/logs/read').index(queryParams, (err, results) => {

      if (err) {
        return callback(err);
      }

      console.log(
        results.data.map(log => {
          let date = log.created_at.split('T');
          date[1] = date[1].slice(0, date[1].length - 1);
          date = date.join(' ');
          let color = LOG_TYPE_COLORS[log.log_type];
          let service = chalk.cyan(log.service_name.replace('/', '.')) +
            chalk.green('[@' + (log.version || log.environment) + ']') +
            chalk.yellow(log.function_name ? ('.' + log.function_name.replace('/', '.')) : '');
          return chalk[color](`${date} `) +
            service +
            chalk[color]('> ') +
            log.value;
        }).join('\n')
      );

      return callback(null);

    });
  }

}

module.exports = LogsCommand;
