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

class TaskList extends Command {

  constructor() {
    super('task', 'list');
  }

  help() {
    return {
      description: 'Lists your scheduled tasks'
    };
  }

  run(params, callback) {

    const host = 'api.polybit.com';
    const port = 443;

    let resource = new APIResource(host, port);

    resource.authorize(Credentials.read('ACCESS_TOKEN'));
    resource.request('/v1/scheduled_tasks').index({}, (err, response) => {

      if (err) {
        return callback(err);
      }

      let fields = [
        'Name',
        'Service',
        'Function',
        'Frequency',
        'Period',
        'Last Invoked'
      ];

      let objects = response.data.map((object) => {
        return {
          'Name': object.name,
          'Service': object.service.name,
          'Function': object.function_name || '__main__',
          'Frequency': `${object.frequency} time(s)`,
          'Period': `per ${convertPeriodToString[object.period]}`,
          'Last Invoked': object.last_invoked_at || 'never'
        };
      });


      let table = tabler(fields, objects);

      if (!params.destroy) {
        // just print out the tasks
        console.log();
        console.log(table);
        console.log();
        return callback(null);

      } else {
        // turn them into questions for task:destroy
        let tableLines = table.split('\n');
        let header = tableLines.shift();
        let separator = tableLines.shift();

        let ids = response.data.map(task => task.id);
        let choices = tableLines.map((task, index) => {
          return {
            name: task,
            value: ids[index],
            short: task.substr(1, task.indexOf('|') - 1),
          };
        });
        choices.unshift(new inquirer.Separator(separator));

        let questions = [{
          name: 'task',
          message: header,
          type: 'list',
          choices: choices,
        }];

        return callback(null, questions);

      }

    });

  }

}

module.exports = TaskList;
