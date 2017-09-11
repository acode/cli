"use strict";

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const chalk = require('chalk');

const Credentials = require('../../credentials.js');

class TaskList extends Command {
  constructor() {
    super('task', 'list');
  }

  help() {
    return {
      description: 'List your scheduled tasks'
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
      
      let taskStrings = printTasks(response.data);

      if (!params.destroy) {
        taskStrings.unshift('');
        taskStrings.push('');
        return callback(null, taskStrings.join('\n')); 
      } else {
        let taskStringsWithId = [taskStrings, response.data.map(task => task.id)]
        return callback(null, taskStringsWithId);
      }

    });

  }
}

function printTasks(tasks) {
  
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
  
  let nameHeaderSpace = longestName - 4 > 0 ? longestName - 4 : 0;
  let functionHeaderSpace = longestFunctionName - 8 > 0 ? longestFunctionName - 8 : 0;
  let frequencyHeaderSpace = longestFrequency - 9 > 0 ? longestFrequency - 9 : 0;

  let taskStrings = [];

  taskStrings.push(`${chalk.blue('Name')}${' '.repeat(nameHeaderSpace)}  ${chalk.blue('Function')}${' '.repeat(functionHeaderSpace)}\
  ${chalk.blue('Frequency')}${' '.repeat(frequencyHeaderSpace)}  ${chalk.blue('Last Invoked')}`)
  
  tasks.map(function (task, index) {
    taskStrings.push(`${task.name}${' '.repeat(longestName - task.name.length)}  ${task.function_name}${' '.repeat(longestFunctionName - task.function_name.length)}\
  ${frequencies[index]}${' '.repeat(longestFrequency - frequencies[index].length)}  ${task.last_invoked_at}`);
  });

  return taskStrings;
}

function period(p) {

  if (p === 60) {
    return 'minute'
  }
  if (p === 3600) {
    return 'hour'
  }
  if (p === 86400) {
    return 'day'
  }
  if (p === 604800) {
    return 'week'
  }

}

module.exports = TaskList;
