const path = require('path');
const DEFAULT_BUILD = 'faaslang';
const DEFAULT_VERSION = '0.0.0';

module.exports = {
	get: () => {
		let stdlibJSON;
		let packageJSON;

		try {
      packageJSON = require(path.join(process.cwd(), 'package.json'));
    } catch(err) {
      throw new Error('Invalid package.json');
		}

		try {
      stdlibJSON = require(path.join(process.cwd(), 'stdlib.json'));
		} catch (err) {
			stdlibJSON = null;
		}

		if (packageJSON.hasOwnProperty('stdlib') && stdlibJSON) {
			throw new Error('Please remove property "stdlib" from package.json since stdlib.json is present.');
		}

		packageJSON.stdlib = packageJSON.stdlib || stdlibJSON || {};

		// Set from package.json (legacy path)
		packageJSON.stdlib.build = packageJSON.stdlib.build || packageJSON.build || 'faaslang';
		packageJSON.stdlib.version = packageJSON.stdlib.version || packageJSON.version || '0.0.0';
		packageJSON.stdlib.name = packageJSON.stdlib.name || packageJSON.name || '';

		// Set fields that are needed
		packageJSON.stdlib.local = packageJSON.stdlib.local || {};

		return packageJSON;
	}
};
