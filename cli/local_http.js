const fs = require('fs');
const path = require('path');

const { Daemon, FunctionParser } = require('functionscript');
const LocalGateway = require('./local_gateway');
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

  try {
    stdlib = require(path.join(process.cwd(), 'stdlib.json'));
  } catch (e) {
    console.error(e);
    console.error(new Error('Invalid stdlib.json in this directory'));
    process.exit(1);
  }

  // Load transformers
  let transformers = [];
  if (stdlib.transformers) {
    if (!Array.isArray(stdlib.transformers)) {
      throw new Error(`"stdlib.json": "transformers" must be an array`);
    }
    transformers = stdlib.transformers.map(transformerData => {
      let Transformer;
      let transformer;
      if (!transformerData.pathname) {
        throw new Error(`"stdlib.json": "transformers" object must contain "pathname"`);
      }
      try {
        Transformer = require(path.join(process.cwd(), transformerData.pathname));
        let config = transformerData.config || {};
        if (!config || typeof config !== 'object') {
          throw new Error(`"stdlib.json": "transformers[].config" must be empty or contain an object`);
        }
        transformer = new Transformer(config);
        transformer.config = transformerData.config;
      } catch (e) {
        console.error(e);
        throw new Error(`Could not load transformer: "${transformerData.pathname}"`);
      }
      return transformer;
    });
  }

  // Cluster to Gateway
  let gateway = new LocalGateway({
    port: PORT,
    maxRequestSizeMB: MAX_REQUEST_SIZE,
    debug: true
  });
  let functionParser = new FunctionParser();
  try {
    let preloadFiles = {};
    transformers.forEach(transformer => {
      let name = transformer.name || transformer.constructor.name;
      let t = new Date().valueOf();
      console.log(`\n[Transformer: ${name}] Execution starting`);
      console.log(`[Transformer: ${name}] Using config ${JSON.stringify(transformer.config)}`);
      let files = transformer.compile(process.cwd(), env.local);
      Object.keys(files).forEach(pathname => {
        if (preloadFiles[pathname]) {
          throw new Error(`[Transformer: ${name}]: Previous Transformer has already defined "${pathname}"`);
        } else {
          preloadFiles[pathname] = files[pathname];
        }
      });
      let t0 = new Date().valueOf() - t;
      console.log(`[Transformer: ${name}] Executed in ${t0} ms`);
    });
    gateway.service(ROUTE);
    gateway.environment(env.local || {});
    gateway.define(
      functionParser.load(
        process.cwd(),
        'functions',
        'www',
        null,
        preloadFiles
      ),
      preloadFiles
    );
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
