"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const Credentials = require('../../credentials.js');
const tabler = require('../../tabler.js');

const convertPeriodToString = {
  60: 'minute',
  3600: 'hour',
  86400: 'day',
  604800: 'week'
};

class TasksList extends Command {

  constructor() {
    super('tasks', 'list');
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

    const host = 'api.polybit.com';
    const port = 443;

    let JSONoutput = params.flags.hasOwnProperty('j') || params.vflags.hasOwnProperty('json');

    let resource = new APIResource(host, port);

    resource.authorize(Credentials.read('ACCESS_TOKEN'));
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
            return {
              'Name': scheduledTask.name,
              'Service': scheduledTask.service.name,
              'Function': scheduledTask.function_name || '__main__',
              'Frequency': `${scheduledTask.frequency} time(s)`,
              'Period': `per ${convertPeriodToString[scheduledTask.period]}`,
              'Last Invoked': scheduledTask.last_invoked_at || 'never'
            };
          })
        )
      );
    });
  }
}

module.exports = TasksList;
