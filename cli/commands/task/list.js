"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');
const inquirer = require('inquirer');

const Credentials = require('../../credentials.js');
const tabler = require('../../tabler.js');

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
        'Function',
        'Frequency',
        'Last Invoked'
      ];

      let objects = response.data.map((object) => {
        return {
          'Name': object.name,
          'Function': object.function_name || '__main__.js',
          'Frequency': object.frequency,
          'Last Invoked': object.last_invoked_at || 'never'
        };
      });


      let table = tabler(fields, objects);

      if (!params.destroy) {
        // just print out the tasks
        return callback(null, table);

      } else {
        // turn them into questions for task:destroy
        let tableLines = table.split('\n');
        let header = tableLines[0];
        let separator = tableLines[1];
        let ids = response.data.map(task => task.id);
        let tasks = tableLines.slice(2);

        let choices = tasks.map((task, index) => {
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

function formatTasks(tasks) {

  function lengthOfLongest(arr) {
    return arr.reduce((a, b) => {
      return a.length > b.length ? a : b;
    }).length;
  }

  function formatFrequency(task) {
    return `${task.frequency} time(s) per ${period(task.period)}`
  }

  let frequencies = tasks.map(task => formatFrequency(task));
  let longestFrequency = lengthOfLongest(frequencies) > 4 ? lengthOfLongest(frequencies) : 4;

  let longestName = lengthOfLongest(tasks.map(task => task.name));
  longestName = longestName > 8 ? longestName : 8;

  let longestFunctionName = lengthOfLongest(tasks.map(task => task.function_name));
  longestFunctionName = longestFunctionName > 9 ? longestFunctionName : 9;

  let taskStrings = [];

  let nameHeaderSpace = longestName - 4 > 0 ? longestName - 4 : 0;
  let functionHeaderSpace = longestFunctionName - 8 > 0 ? longestFunctionName - 8 : 0;
  let frequencyHeaderSpace = longestFrequency - 9 > 0 ? longestFrequency - 9 : 0;

  taskStrings.push(`${chalk.bold.blue('Name')}${' '.repeat(nameHeaderSpace)}  ${chalk.bold.blue('Function')}${' '.repeat(functionHeaderSpace)}\
  ${chalk.bold.blue('Frequency')}${' '.repeat(frequencyHeaderSpace)}  ${chalk.bold.blue('Last Invoked')}`)

  tasks.map(function (task, index) {

    taskStrings.push(`${task.name}${' '.repeat(longestName - task.name.length)}  ${task.function_name}${' '.repeat(longestFunctionName - task.function_name.length)}\
  ${frequencies[index]}${' '.repeat(longestFrequency - frequencies[index].length)}  ${task.last_invoked_at}`);

  });

  return taskStrings;

}

function period(p) {

  if (p === 60) return 'minute';
  if (p === 3600) return 'hour';
  if (p === 86400) return 'day';
  if (p === 604800) return 'week';

}

module.exports = TaskList;
