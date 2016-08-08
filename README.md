# stdlib
## The Standard Library of the Internet

If you're not familiar with stdlib, check out [stdlib.com](https://stdlib.com).

This is both the lightweight CLI and Node.js library.

## Command Line Interface

Install using `npm install stdlib.com -g`.

Use stdlib using `stdlib <command>` where commands are;

```
f
	Runs a <stdlib> function

f:compile
	Compiles <stdlib> Function

f:new
	Creates an index.js and package.json file in the current directory

f:unlink
	Unlinks (removes) current or specified <stdlib> Function

login
	Logs in to stdlib in this directory

logout
	Logs out of stdlib in this directory

register
	Registers a new stdlib user account
```

You can also use `f <function>` as a shortcut for `stdlib f <function>`.

## Use in Node.js Apps

To add stdlib to a Node.js project, type:

```
npm install stdlib --save
```

Example usage

```javascript
const stdlib = require('s');

stdlib.f('user/namespace/func')(
  'arg0 arg1 -f hi --verbose hello',
  (err, response) => {
    // do something
  }
);

// OR...

stdlib.f('user/namespace/func')(
  {
    args: ['arg0', 'arg1'],
    flags: {
      f: ['hi']
    }
    vflags: {
      verbose: ['hello']
    }
  },
  (err, response) => {
    // do something
  }
);
```

## That's it!

Yep, it's really that simple. We're in open beta, so please don't hesitate to
file GitHub issues if you need to!

Follow us on Twitter, [@polybit](https://twitter.com/polybit)
