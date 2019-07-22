const path = require('path');

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
			// Nothing
		}

		if (!stdlibJSON && !packageJSON.stdlib) {
			throw new Error('No stdlib information set in "package.json"');
		}

		if ((stdlibJSON && !stdlibJSON.name) && !packageJSON.stdlib.name) {
			throw new Error(`No stdlib name set in "${stdlibJSON ? 'stdlib.json' : 'package.json'}"`);
		}

		return stdlibJSON || packageJSON;
	}
};
