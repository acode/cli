const { Daemon, FunctionParser } = require('functionscript');
const LocalGateway = require('./local_gateway');
const path = require('path');
const chalk = require('chalk');

const processArgs = process.argv.slice(2).reduce((processArgs, val) => {
  let [key, value] = val.split('=');
  processArgs[key] = value;
  return processArgs;
}, {});

const cluster = require('cluster');
const PORT = processArgs.PORT || process.env.PORT || 8000;
const ROUTE = processArgs.ROUTE || process.env.ROUTE || '/';
const NAME = processArgs.NAME || 'Unnamed API Project';
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE && parseInt(process.env.MAX_REQUEST_SIZE) || null;

if (cluster.isMaster) {

  // Start HTTP Daemon
  new Daemon(1).start(PORT);

} else {

  try {
    env = require(path.join(process.cwd(), 'env.json'));
  } catch (e) {
    console.error(e);
    console.error(new Error('Invalid env.json in this directory'));
    process.exit(1);
  }

  // Cluster to Gateway
  let gateway = new LocalGateway({
    port: PORT,
    maxRequestSizeMB: MAX_REQUEST_SIZE,
    debug: true
  });
  let functionParser = new FunctionParser();
  try {
    gateway.service(ROUTE);
    gateway.environment(env.local || {});
    gateway.define(functionParser.load(process.cwd(), 'functions', 'www'));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }

  gateway.listen(PORT);

  console.log();
  console.log(`Autocode API:`);
  console.log(`\t${chalk.bold.blue(NAME)}`);
  console.log();
  console.log(`Running on:`);
  console.log(`\t${chalk.bold.green(`localhost:${PORT}${ROUTE}`)}`);
  console.log();

}
