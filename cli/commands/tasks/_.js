"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const config = require('../../config.js');
const tabler = require('../../tabler.js');

const convertPeriodToString = {
  60: 'minute',
  3600: 'hour',
  86400: 'day',
  604800: 'week'
};

class TasksListCommand extends Command {

  constructor() {
    super('tasks');
  }

  help() {
    return {
      description: 'Lists your scheduled tasks',
      flags: {
        j: 'Returns tasks as a JSON object'
      },
      vflags: {
        json: 'Returns tasks as a JSON object'
      }
    };
  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    let JSONoutput = params.flags.hasOwnProperty('j') || params.vflags.hasOwnProperty('json');

    let resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));
    resource.request('/v1/scheduled_tasks').index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      if (JSONoutput) {
        return callback(null, response.data);
      }

      return callback(null,
        tabler(
          [
            'Name',
            'Service',
            'Function',
            'Frequency',
            'Period',
            'Last Invoked'
          ],
          response.data.map((scheduledTask) => {
            let scheduledTaskIdentifier = (scheduledTask.environment || scheduledTask.version) ? 
              `[@${scheduledTask.environment || scheduledTask.version}]` : 
              '';
            return {
              'Name': scheduledTask.name,
              'Service': scheduledTask.service_name.replace('/', '.') + scheduledTaskIdentifier,
              'Function': scheduledTask.function_name || '__main__',
              'Frequency': `${scheduledTask.frequency} time(s)`,
              'Period': `per ${convertPeriodToString[scheduledTask.period]}`,
              'Last Invoked': scheduledTask.last_invoked_at || 'never'
            };
          }), true
        ) + '\n'
      );
    });
  }
}

module.exports = TasksListCommand;
