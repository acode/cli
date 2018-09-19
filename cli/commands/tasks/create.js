'use strict';

const Command = require('cmnd').Command;
const APIResource = require('api-res');
const config = require('../../config.js');

const faaslang = require('faaslang');
const chalk = require('chalk');
const inquirer = require('inquirer');
const async = require('async');

const DAYS = 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(' ');
const HOURS = Array(24).fill().map((v, i) => `${i}:00 UTC`);

const TIME_UNITS = 'minute hour day week'.split(' ');
const SECONDS_PER_TIME_UNIT = {
  'minute': 60,
  'hour': 3600,
  'day': 86400,
  'week': 604800
};

const FREQUENCY_TABLE = {
  'once': 1,
  'twice': 2,
  'three times': 3,
  'four times': 4,
  'five times': 5,
  'six times': 6,
  'ten times': 10,
  'twelve times': 12,
  'fifteen times': 15,
  'twenty times': 20,
  'thirty times': 30
};

const PARAM_PROMPT_PREFIX = '$param__';
const CRON_EXPRESSION_LENGTH = 5;

function convertPeriodOffset(periodOffset, weeklyPeriodOffset) {

  let offset = 0;

  if (!periodOffset && !weeklyPeriodOffset) {
    return offset;
  }

  if (weeklyPeriodOffset) {
    offset += SECONDS_PER_TIME_UNIT['day'] * DAYS.indexOf(weeklyPeriodOffset);
  }

  if (HOURS.indexOf(periodOffset) !== -1) {
    offset += SECONDS_PER_TIME_UNIT['hour'] * HOURS.indexOf(periodOffset);
  } else {
    offset += SECONDS_PER_TIME_UNIT['minute'] * periodOffset;
  }

  return offset;

}

function getFunctionDetails(resource, service, functionName, identifier, callback) {

  let params = {
    name: service
  }
  if (identifier === 'latest') {
    params.latest = true;
  } else if (isNaN(identifier[0])) {
    params.environment = identifier;
  } else {
    params.version = identifier;
  }

  resource.request('/v1/cached_services').index(params, (err, response) => {

    if (err) {
      return callback(err);
    }

    if (!response.data.length) {
      return callback(new Error('No matching services found'));
    }

    if (!response.data[0].services.length) {
      return callback(new Error('No services matching @' + identifier + ' found'));
    }

    let selectedService = response.data[0].services[0];

    if (!selectedService.definitions_json[functionName]) {
     return callback(new Error(`Could not find function "${functionName}" in service ${service.replace('/', '.')}`));
    }

    return callback(null, {
      selectedService: selectedService,
      functionName: functionName,
      params: selectedService.definitions_json[functionName].params
    });

  });

}

function getTokens(resource, callback) {

  resource.request('v1/library_tokens').index({}, (err, response) => {

    if (err) {
      return callback(err);
    }

    if (!response.data.length) {
      return callback(new Error('You have no library tokens'));
    }

    let tokens = response.data.map((token) => {
      return {
        name: `${token.label}: ${token.token.slice(0, 5)}...`,
        value: token.id.toString(),
        short: token.label
      };
    });

    return callback(null, tokens);

  });

}

function generateQuestions(tokens, functionDetails) {

  let questions = [];

  if (functionDetails.params) {
    questions = functionDetails.params.map((param) => {
      return {
        name: `${PARAM_PROMPT_PREFIX}${param.name}`,
        type: 'input',
        message: `Enter param for parameter "${param.name}" (type ${param.type})`,
        argument: true
      };
    });
  }

  questions = questions.concat([{
    name: 'library_token_id',
    type: 'list',
    message: 'Pick a library token to use',
    choices: tokens
  }, {
    name: 'syntax',
    type: 'list',
    message: 'Which syntax would you like to use to create your task?',
    choices: ['simple', 'cron']
  }, {
    name: 'cron_expression',
    type: 'input',
    message: `Enter a cron expression with ${CRON_EXPRESSION_LENGTH} fields: `,
    validate: (value) => {
      if (value.trim().split(' ').length === CRON_EXPRESSION_LENGTH) {
        return true;
      } else {
        return 'Please enter a cron expression with the correct number of fields.';
      }
    },
    when: (answers) => answers.syntax === 'cron'
  }, {
    name: 'period',
    type: 'list',
    message: 'Run service every: ',
    choices: TIME_UNITS,
    when: (answers) => answers.syntax === 'simple'
  }, {
    name: 'frequency',
    type: 'list',
    message: (answers) => `How ofter per ${answers.period}`,
    choices: (answers) => {
      if (answers.period === 'minute') {
        return ['once'];
      }
      return Object.keys(FREQUENCY_TABLE).filter((v) => {
        let periodSeconds = SECONDS_PER_TIME_UNIT[answers.period];
        let dividingPeriod = TIME_UNITS[TIME_UNITS.indexOf(answers.period) - 1];
        let dividingPeriodSeconds = SECONDS_PER_TIME_UNIT[dividingPeriod];
        return (periodSeconds % (dividingPeriodSeconds * FREQUENCY_TABLE[v])) === 0;
      });
    },
    when: (answers) => answers.syntax === 'simple'
  }, {
    name: 'period_offset',
    type: 'input',
    message: 'Starting at minute',
    validate: (value, answers) => {
      let offset = Number(value);
      let maxOffset = SECONDS_PER_TIME_UNIT[answers.period] / FREQUENCY_TABLE[answers.frequency] / 60;
      if (Number.isInteger(offset) && (offset >= 0 && offset < maxOffset)) {
        return true;
      }
      return `Please enter an integer between 0 - ${maxOffset - 1} inclusive.`;
    },
    when: (answers) => answers.period === 'hour' && answers.syntax === 'simple'
  }, {
    name: 'weekly_period_offset',
    type: 'list',
    message: 'Starting on',
    choices: DAYS,
    when: (answers) => answers.period === 'week' && answers.syntax === 'simple'
  }, {
    name: 'period_offset',
    type: 'list',
    message: 'Starting at',
    choices: (answers) => {
      let maxOffset = HOURS.length / FREQUENCY_TABLE[answers.frequency];
      return HOURS.slice(0, maxOffset);
    },
    when: (answers) => answers.period === 'day' && answers.syntax === 'simple'
  }, {
    name: 'period_offset',
    type: 'list',
    message: 'Starting at',
    choices: HOURS,
    when: (answers) => answers.period === 'week' && answers.syntax === 'simple'
  }, {
    name: 'taskName',
    type: 'input',
    message: 'Task name',
  }]);

  return questions;

}

class TasksCreateCommand extends Command {

  constructor() {

    super('tasks', 'create');

  }

  help() {

    return {
      description: 'Creates a Scheduled Task from a StdLib service',
      args: [
        'service'
      ]
    };

  }

  run(params, callback) {

    let host = params.flags.h ? params.flags.h[0] : 'https://api.polybit.com';
    let port = params.flags.p && params.flags.p[0];

    const resource = new APIResource(host, port);
    resource.authorize(config.get('ACCESS_TOKEN'));

    let service = params.args[0];

    if (!service) {
      console.log();
      console.log(chalk.bold.red('Oops!'));
      console.log();
      console.log(`Please specify a service name`);
      console.log();
      return callback(null);
    }

    let functionName = '';
    let identifier = 'latest';

    let serviceParts = service.split('.');
    if (serviceParts.length === 3) {
      service = serviceParts.slice(0, 2).join('.');
      functionName = serviceParts[2];
    }
    
    let env = /^(.+?)\[@(.+?)\](?:\.(.*?))?$/.exec(service);
    if (env) {
      service = env[1];
      identifier = env[2];
    }

    service = service.replace('.', '/');

    async.parallel([
      getTokens.bind(null, resource),
      getFunctionDetails.bind(null, resource, service, functionName, identifier)
    ], (err, results) => {

      if (err) {
        return callback(err);
      }

      let tokens = results[0];
      let functionDetails = results[1];
      let functionDefinition = functionDetails.selectedService.definitions_json[functionDetails.functionName];

      inquirer.prompt(generateQuestions(tokens, functionDetails), (answers) => {

        let taskParams = {
          name: answers.taskName,
          library_token_id: answers.library_token_id,
          service_name: functionDetails.selectedService.name,
          function_name: functionDetails.functionName
        }
        
        if (answers.cron_expression) {
          taskParams.cron_expression = answers.cron_expression.trim();
        } else {
          taskParams.frequency = FREQUENCY_TABLE[answers.frequency],
          taskParams.period = SECONDS_PER_TIME_UNIT[answers.period],
          taskParams.period_offset = convertPeriodOffset(answers.period_offset, answers.weekly_period_offset)
        }

        if (identifier !== 'latest') {
          taskParams.environment = functionDetails.selectedService.environment;
          taskParams.version = functionDetails.selectedService.version;
        }

        try {

          taskParams.kwargs = Object.keys(answers)
            .filter(key => key.indexOf(PARAM_PROMPT_PREFIX) === 0)
            .reduce((params, key) => {
              let paramName = key.substr(PARAM_PROMPT_PREFIX.length);
              let value = answers[key];
              let paramInfo = functionDefinition.params.find((param) => {
                return param.name === paramName;
              });
              try {
                let isValid = faaslang.types.validate(paramInfo.type, faaslang.types.parse(paramInfo.type, value, true), !!paramInfo.hasOwnProperty('defaultValue'));
                if (!isValid) {
                  throw new Error('Invalid type');
                }
              } catch (e) {
                throw new Error(`Invalid value for parameter "${paramName}". "${value}" should be type ${paramInfo.type}.`);
              }
              params[paramName] = value;
              return params;
            }, {});

        } catch (e) {

          return callback(e);

        }

        resource.request('/v1/scheduled_tasks').create({}, taskParams, (err, response) => {

          if (err) {
            return callback(err);
          }

          console.log();
          console.log(chalk.bold.green('Success!'));
          console.log();
          console.log(`Task ${chalk.bold(taskParams.name)} created`);
          console.log();

          return callback(null);

        });

      });

    });

  }

}

module.exports = TasksCreateCommand;
