"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const config = require('../../config.js');
const ListCommand = require('./_.js');
const tabler = require('../../tabler.js');

const inquirer = require('inquirer');
const chalk = require('chalk');

const convertPeriodToString = {
  60: 'minute',
  3600: 'hour',
  86400: 'day',
  604800: 'week'
};

class TasksDestroyCommand extends Command {

  constructor() {
    super('tasks', 'destroy');
  }

  help() {
    return {
      description: 'Stops a StdLib scheduled task'
    };
  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    ListCommand.prototype.run.call(this, {flags: {}, vflags: {json: true}}, (err, results) => {

      if (err) {
        return callback(err);
      }
      
      let ids = results.map(task => task.id);
      inquirer.prompt(
        [
          {
            name: 'task',
            type: 'list',
            pageSize: 100,
            message: `Select a task to ${chalk.bold.red('Destroy (Permanently)')}`,
            choices: tabler(
              ['?', 'Name', 'Service', 'Function', 'Frequency', 'Period', 'Last Invoked'],
              results.map((task, index) => {
                return {
                  '?': ['✖', chalk.bold.red],
                  Name: task.name,
                  Service: task.service.name,
                  Function: task.function_name || '__main__',
                  Frequency: `${task.frequency} time(s)`,
                  Period: `per ${convertPeriodToString[task.period]}`,
                  'Last Invoked': task.last_invoked_at || 'never',
                  value: ids[index]
                };
              }),
              true,
              true
            )
              .map(row => (row.value === null ? new inquirer.Separator(row.name) : row))
              .concat({
                name: '○ ' + chalk.grey('(cancel)'),
                value: 0
              })
          },
          {
            name: 'verify',
            type: 'confirm',
            message: answers => {
              return (
                `Are you sure you want to ${chalk.bold.red('permanently destroy')} ` +
                `task "${chalk.bold(answers.task.Name)}"?`
              );
            },
            when: answers => !!answers.task
          }
        ],
        answers => {
          if (answers.task === 0) {
            return callback(null);
          }

          let resource = new APIResource(host, port);
          resource.authorize(config.get('ACCESS_TOKEN'));
          resource
            .request('/v1/scheduled_tasks')
            .destroy(answers.task.value, {}, (err, response) => {
              if (err) {
                return callback(err);
              }
              console.log();
              console.log('Task successfully deleted');
              console.log();
              return callback(null);
            });
        }
      );

    });

  }

}

module.exports = TasksDestroyCommand;
