"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const Credentials = require('../../credentials.js');
const ListCommand = require('./list.js');
const tabler = require('../../tabler.js');

const inquirer = require('inquirer');

const convertPeriodToString = {
  60: 'minute',
  3600: 'hour',
  86400: 'day',
  604800: 'week'
};

class TasksDestroy extends Command {

  constructor() {
    super('tasks', 'destroy');
  }

  help() {
    return {
      description: 'Stops a StdLib scheduled task'
    };
  }

  run(params, callback) {

    const host = 'api.polybit.com';
    const port = 443;

    params.flags.j = true;

    ListCommand.prototype.run.call(this, params, (err, results) => {

      if (err) {
        return callback(err);
      }

      let table = tabler(
        [
          'Name',
          'Service',
          'Function',
          'Frequency',
          'Period',
          'Last Invoked'
        ],
        results.map((scheduledTask) => {
          return {
            'Name': scheduledTask.name,
            'Service': scheduledTask.service.name,
            'Function': scheduledTask.function_name || '__main__',
            'Frequency': `${scheduledTask.frequency} time(s)`,
            'Period': `per ${convertPeriodToString[scheduledTask.period]}`,
            'Last Invoked': scheduledTask.last_invoked_at || 'never'
          };
        })
      ).split('\n');

      let header = table.shift();
      let separator = table.shift();
      let ids = results.map(task => task.id);

      let questions = [{
        name: 'task',
        message: header,
        type: 'list',
        choices: [new inquirer.Separator(separator)].concat(table.map((task, index) => {
          return {
            name: task,
            value: ids[index],
            short: task.substr(1, task.indexOf('|') - 1)
          };
        }))
      }];

      inquirer.prompt(questions, (answers) => {

        let resource = new APIResource(host, port);

        resource.authorize(Credentials.read('ACCESS_TOKEN'));
        resource.request('/v1/scheduled_tasks').destroy(answers.task, {}, (err, response) => {

          if (err) {
            return callback(err);
          }

          console.log();
          console.log('Task successfully deleted')
          console.log();
          return callback(null);

        });

      });

    });

  }

}

module.exports = TasksDestroy;
