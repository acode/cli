# ![stdlib](http://stdlib.com/static/images/stdlib-256.png)
## A Standard Library for the Web

[stdlib is a Standard Library of Functional Microservices for the Web](https://stdlib.com).

It's both a platform for creating and launching functional microservices, as well as
a central directory to share and discover new services by other users.

This repository is the primary SDK and CLI tools for stdlib service development.

## Getting Started

Getting started with stdlib is easy. We'll walk you through a few steps;

1. Installing the stdlib CLI Tools
2. Create a Function Directory
3. Registration / Login
4. Function Creation (Development)
5. Function Compilation
6. Function Execution
7. Deleting (Unlinking) Functions
8. Listing Functions

### Installing the stdlib CLI Tools

To install the stdlib command line tools, simply install the `stdlib.com`
package from npm globally.

```
$ npm install stdlib.com -g
```

### Create a Function Directory

Next, Create a directory for the function you'll be working with.

```
$ mkdir my-func
$ cd my-func
```

### Registration / Login

Make sure you're in your function directory, `my-func`.

If you haven't registered for stdlib yet, register using;

```
$ stdlib register
```

Alternatively, login using:

```
$ stdlib login
```

A command prompt will guide you through the process.

### Function Creation (Development)

To create a function, type:

```
$ stdlib f:new <username>/<namespace>/<name>
```

You'll want to make sure your username is your username or an organization
you have access to, otherwise `namespace` and `name` are completely up to you.

This will create a `index.js`, `package.json` and `env.json` file in the
current directory.

#### index.js

This file will look something like this:

```javascript
module.exports = (params, callback) => {
	// Node version: 6.5.0
	// params has keys: {args, flags, vflags, env, remoteAddress}
	let a = parseInt(params.args[0]) || 0;
	let b = parseInt(params.args[1]) || 0;
	let name = params.kwargs.name || 'World';
	// Once this function has compiled, try executing it with:
	//   f <username>/dev/hello 1 2 --name Name
	return callback(null, `Hello ${name}, ${a} + ${b} = ${a + b}`);
};
```

Here's what you need to know:

`params` is an Object that contains:

- `args`: Array of function arguments passed to the service
- `kwargs`: Object (key-values) of function keyword arguments
- `buffer`: Raw POST data (for file manipulation)
- `env`: Contains your `env.json` data
- `remoteAddress`: The requesting IPv4/IPv6 address

`callback` is a function that takes two parameters, an error (or `null` if
	no error) and a JSON-serializable response (or `Buffer` for files).

`callback` should be executed when your function has completed. Do not expect
background processes to finish --- if you're waiting on asynchronous events
use a synchronization library like `async`.

**Please note** that you can declare variables outside of the `module.exports`
statement to speed up subsequent service calls, but do not rely on them for
memory storage in any predictable fashion --- treat each execution as if it's
stateless.

#### package.json

This is your basic npm package.json. Define `dependencies` as you would normally,
they'll be installed for production when you compile your microservice. You can
do this using:

```
$ npm install <package> --save
```

The name will be where your service is deployed to, following the
`<username>/<namespace>/<name>` pattern. Note that setting `"private": true`
will prevent your microservice from being listed in the stdlib search results.

#### env.json

Contains environment variables (for development environment) in `params.env`.
Note that these values will *not* be pushed to production. To change production
environment variables, use:

```
$ stdlib f:env --set <key> <value>
```

and

```
$ stdlib f:env --remove <key>
```

### Function Compilation

Compilation is also known as deployment, and it's how you push your microservices
to production. As long as you're logged in, when you're ready to share your
creation with the world just type:

```
$ stdlib f:compile
```

You'll be given instructions on how to access it once it's live.

### Function Execution

To run your function, you can access it via the web using the stdlib gateway
service (f.stdlib.com) and the function name.

We've created a [Node.js and Web library called "f"](https://github.com/poly/f)
for running your functions from other applications and the command line.

### Deleting (Unlinking) Functions

To delete a function simply type:

```
$ stdlib f:unlink <username>/<namespace>/<name>
```

The namespace will likely be recompiled, so this may take a few minutes.

### Listing Functions

The command to see all available functions in production is straightforward as well.

```
$ stdlib f:list
```

## That's it!

Yep, it's really that simple. We're in open beta, so please don't hesitate to
file GitHub issues if you need to!

stdlib is &copy; 2016 Polybit Inc.

Want to support us? [Sign up on the web for stdlib](https://stdlib.com/).

Check out our [library for microservice execution, f](https://github.com/poly/f).

Follow us on Twitter, [@polybit](https://twitter.com/polybit)
