const path = require('path');

class Transformers {

  constructor (env, stdlib, environment) {
    this.env = env;
    this.stdlib = stdlib;
    this.environment = environment;
    this.list = [];
    this.load();
  }

  load () {
    let stdlib = this.stdlib;
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
          let configEnv = config[this.environment] || {};
          if (!config[this.environment] || typeof config[this.environment] !== 'object') {
            throw new Error(`"stdlib.json": "transformers[].config['${this.environment}']" must be empty or contain an object`);
          }
          transformer = new Transformer(config[this.environment]);
          transformer.config = transformerData.config[this.environment];
        } catch (e) {
          console.error(e);
          throw new Error(`Could not load transformer: "${transformerData.pathname}"`);
        }
        return transformer;
      });
    }
    return this.list = transformers;
  }

  compile () {
    let preloadFiles = {};
    this.list.forEach(transformer => {
      let name = transformer.name || transformer.constructor.name;
      let t = new Date().valueOf();
      console.log(`\n[Transformer: ${name}] Execution starting`);
      console.log(
        `[Transformer: ${name}] Using config from stdlib.json: ` +
        `transformers[].config['${this.environment}']\n` +
        `${JSON.stringify(transformer.config, null, 2)}`
      );
      let files = transformer.compile(process.cwd(), this.env[this.environment]);
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
    return preloadFiles;
  }

}

module.exports = Transformers;
