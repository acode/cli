# ![StdLib](http://stdlib.com/static/images/stdlib-256.png)
## A Standard Library for Microservices

[StdLib is a Standard Library for Microservices](https://stdlib.com)

StdLib allows you to turn functions into infinitely scalable, self-healing
web services with a single command. Based on Function as a Service ("server-less")
architecture, popularized by AWS Lambda, StdLib has three parts; an application
framework, a service registry, and a service distribution platform. In only a
couple of minutes you can use StdLib to build modular, scalable web services
without having to manage servers, gateways or domains. You've never shipped
web services and APIs as quickly as you will with StdLib.

You can view publicly available services [on the StdLib search page](https://stdlib.com/search).

![stdlib-process](http://stdlib.com/static/images/stdlib_usage.gif)

## Introduction

The central focus of StdLib revolves around *simplicity*, *readability* and
*maintainability*. StdLib provides built-in documentation generation
for your services along with easy to use SDKs in Node.js, Ruby and Python. This
allows your customers and other developers to seamlessly integrate with your services
without any additional effort on your behalf. StdLib represents a careful distillation
of the best features of containerization, microservice deployment and API
generation. You write the code, StdLib takes care of everything else.

A typical StdLib workflow might look like this;

1. Use the CLI to create functions locally with `$ lib create myService`
2. Test and debug locally using `$ lib .myFunction`
3. Deploy to a cloud development environment, `$ lib up dev`
4. Test and debug in the cloud, `$ lib user.myService.myFunction`
5. Release your service when you're ready; `$ lib release`
6. Explore and integrate with other services at https://stdlib.com/search

# Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Your First Service](#creating-your-first-service)
3. [Connecting Service Endpoints](#connecting-service-endpoints)
4. [Accessing Your Microservices From Other Applications](#accessing-your-microservices-from-other-applications)
5. [Accessing Your Microservices Over HTTP](#accessing-your-microservices-over-http)
6. [Version Control and Package Management](#version-control-and-package-management)
7. [Additional Functionality](#additional-functionality)
8. [Acknowledgements](#acknowledgements)
9. [Contact](#contact)

# Getting Started

To get started with StdLib, first make sure you have Node 6.x installed,
[available from the official Node.js website](https://nodejs.org). Next install
the StdLib CLI tools with:

```
$ npm install lib.cli -g
```

And you're now ready to start building!

# Creating Your First Service

The first thing you'll want to do is create a workspace. Create a new directory
you intend to build your services in and initialize the workspace.

```
$ mkdir stdlib-workspace
$ cd stdlib-workspace
$ lib init
```

You'll be asked for an e-mail address to log in to the StdLib registry,
via the Polybit API server. If you don't yet have an account, you can create
one from the command line. Note that you can skip account creation with
`lib init --no-login`. You'll be unable to use the registry, but it's useful
for creating workspaces when you don't have internet access.

Next, create your service:

```
$ lib create <service>
```

You'll be asked for a default function name, which is the entry point
into your service (useful if you only want a single entry point). This will automatically
generate a service project scaffold in `stdlib-workspace/<username>/<service>`.

Once created, enter the service directory:

```
$ cd your-username/your-service
```

In this directory, you'll see something like:

```
- f/
  - defaultFunction/
	  - function.json
		- index.js
- package.json
- env.json
- README.md
```

At this point, there's a "hello world" function that's been automatically
created. StdLib comes paired with a simple `f` command for testing your functions
locally and running them in the cloud. To test your function:

```
$ lib .
> "hello world"
```

If we examine the `f/defaultFunction/index.js` file, we see the following:

```javascript
module.exports = (params, callback) => {

  callback(null, 'hello world');

};
```

If necessary, we can pass some of these parameters to it (`params.args` and `params.kwargs`)
using:

```
f . arg0 arg1 --kwarg0 "Hello World" --kwarg1 Goodbye
```

Though it won't change the function output as-is. `params.args` would be equal
to `["arg0", "arg1"]` and `params.kwargs` would be
`{"kwarg0":"Hello World","kwarg1":"Goodbye"}`.

## Pushing to the Cloud

To push your function to a development environment in the cloud...

```
$ lib up dev
$ lib your-username.your-service[@dev]
> "hello world"
```

And to release it (when you're ready!)

```
$ lib release
$ lib your-username.your-service
> "hello world"
```

You can check out your service on the web, and use it in applications at:

```
https://your-username.stdlib.com/your-service
```

That's it! You haven't written a line of code yet, and you have mastery over
building a service, testing it in a development (staging) environment online,
and releasing it for private (or public) consumption.

**Note:** You'll need to set `"publish": true` in the `lib` key of your
`package.json` file to see your service appear in the public registry. It's
set to `false` by default.

**Another Note:** Staging environments (like the one created with `lib up dev`)
are *mutable* and can be replaced indefinitely. Releases (`lib release`) are
*immutable* and can never be overwritten. However, any service can be torn down
with `lib down <environment>` or `lib down -r <version>` (but releases
	can't be replaced once removed, to prevent mistakes and / or bad actors).

# Connecting Service Endpoints

You'll notice that you can create more than one function per service. While
you can structure your project however you'd like internally, it should also
be noted that these functions have zero-latency access to each other. You
can access them internally with the `lib` [package on NPM](https://github.com/poly/f),
which behaves similarly to the `lib` command for testing. Use:

```
$ npm install lib --save
```

In your main service directory to add it, and use it like so:

#### f/add/index.js
```javascript
module.exports = (params, callback) => {

	return callback(null, params.args[1] + params.args[2]);

};
```

#### f/add-double/index.js
```javascript
const lib = require('lib');

module.exports = (params, callback) => {

	return lib['.add'](params.args[0], params.args[1], (err, result) => {

		callback(err, result * 2);

	});

};
```

In this case, calling `lib .add 1 2` will return `3` and `lib .add-double 1 2`
will return `6`. These map directly to individual service endpoints. **Note** that
when chaining like this, *a single service execution instance* is being used so
be careful about setting service timeouts appropriately.

# Accessing Your Microservices From Other Applications

As mentioned in the previous section, you can use the `lib` library that's
[available on GitHub and NPM](https://github.com/stdlib/lib-node) to access your
microservices from legacy Node.js applications and even the web browser. We'll
have more SDKs coming out in the following months.

A legacy app would call a function (username.liveService with version 0.2.1):

```javascript
const lib = require('lib');

lib.username.liveService['@0.2.1']('hello', 'world', {keyword: 'argument'}, function (err, result) {

	if (err) {
		// handle it
	}

	// do something with result

});
```

Which would speak to your microservice...

```javascript
module.exports = (params, callback) => {

	params.args[0] === 'hello'; // true
	params.args[1] === 'world'; // true
	params.kwargs.keyword === 'argument'; // true

	callback(null, 'Done!');

};
```

# Accessing Your Microservices Over HTTP

We definitely recommend using the [lib library on NPM](https://github.com/stdlib/lib-node)
to make microservice calls as specified above, but you can also make HTTPS
requests directly to the StdLib gateway. HTTP query parameters are mapped
automatically to keyword arguments:

```
https://username.stdlib.com/liveService@1.12.2?name=Keith
```

Maps directly to:

```javascript
module.exports = (params, callback) => {

	params.kwargs.name === 'Keith'; // true

	callback(null, 'Done!');

};
```

**Note** that you will not be able to pass in anything to the `params.args`
parameter.

# Version Control and Package Management

A quick note on version control - StdLib is *not* a replacement for normal
git-based workflows, it is a supplement focused around service creation and
execution.

You have unlimited access to any release (that hasn't been torn down)
with `lib pkg <serviceIdentifier>` to download the tarball (`.tgz`) and
`lib get <serviceIdentifier>` to automatically download and unpack the
tarball to a working directory.

Tarballs (and package contents) are *closed-source*.
Nobody but you (and potentially your teammates) has access to these. It's up to
you whether or not you share the guts of your service with others on GitHub or NPM.

As mentioned above: releases are *immutable* and can not be overwritten (but can
	be removed, just not replaced afterwards) and development / staging environments
	are *mutable*, you can overwrite them as much as you'd like.

# Additional Functionality

StdLib comes packed with a bunch of other goodies - if your service goes down
for any reason (the service platform is acting up), use `lib restart`.
Similarly, as we roll out updates to the platform the builds we're using on
AWS Lambda may change. You can update your service to our latest build using
`lib rebuild`. We may recommend this from time-to-time, so pay attention
to e-mails and the community.

To see a full list of commands available for the CLI tools, type:

```
$ lib help
```

We've conveniently copy-and-pasted the output here for you to peruse;

```
* [all arguments converted to params.args]
	-f                   Specify a file to send (overrides args and kwargs)
	--*                  all verbose flagss converted to params.kwargs

	Runs a StdLib Function (requires a period)

create [service]
	-n                   No login - don't require an internet connection
	-t                   Template - a stdlib service template to use
	-w                   Write over - overwrite the current directory contents
	--no-login           No login - don't require an internet connection
	--template           Template - a stdlib service template to use
	--write-over         Write over - overwrite the current directory contents

	Creates a new (local) service

down [environment]
	-r                   Remove a release version (provide number)
	--release            Remove a release version (provide number)

	Removes StdLib package from registry and cloud environment

f:create [function name]
	-w                   Overwrite existing function
	--write-over         Overwrite existing function

	Creates a new function for a (local) service

get [full service name]
	-f                   Force command if not in root directory
	-w                   Write over - overwrite the target directory contents
	--force              Force command if not in root directory
	--write-over         Write over - overwrite the target directory contents

	Retrieves and extracts StdLib package

http
	-p                   Port (Default 8170)
	--port               Port (Default 8170)

	Creates HTTP Server for Current Service

info [username | full service name]
	Retrieves information about a user or package

init [environment]
	-f                   Force command to overwrite existing workspace
	-n                   No login - don't require an internet connection
	--force              Force command to overwrite existing workspace
	--no-login           No login - don't require an internet connection

	Initializes StdLib workspace

login
	Logs in to StdLib in this directory

logout
	Logs out of StdLib in this workspace

pkg [full service name]
	-f                   Force command if not in root directory
	-o                   Output path for the .tgz package
	--force              Force command if not in root directory
	--output             Output path for the .tgz package

	Downloads StdLib tarball (.tgz)

rebuild [environment]
	-r                   Rebuild a release package
	--release            Rebuild a release package

	Rebuilds a service (useful for registry performance updates), alias of `lib restart -b`

register
	Registers a new StdLib user account

release
	Pushes release of StdLib package to registry and cloud (Alias of `lib up -r`)

restart [environment]
	-b                   Rebuild service fully
	-r                   Restart a release package
	--build              Rebuild service fully
	--release            Restart a release package

	Restarts a StdLib service (if necessary)

rollback
	Rolls back (removes) release of StdLib package (alias of `lib down -r`)

up [environment]
	-r                   Upload a release package
	--release            Upload a release package

	Pushes StdLib package to registry and cloud environment

user
	-s                   <key> <value> Sets a specified key-value pair
	--new-password       Sets a new password via a prompt
	--reset-password     <email> Sends a password reset request for the specified e-mail address
	--set                <key> <value> Sets a specified key-value pair

	Retrieves (and sets) current user information

version
	Returns currently installed version of StdLib command lines tools
```

# That's it!

Yep, it's really that easy. To keep up-to-date on developments, please
star us here on GitHub, and sign up a user account for the registry. You
can read more about service hosting and keep track of official updates on
[the official StdLib website, stdlib.com](https://stdlib.com).

# Acknowledgements

StdLib is a product of and &copy; 2016 - 2017 Polybit Inc.

We'd love for you to pay attention to [@Polybit](https://twitter.com/polybit) and
what we're building next! If you'd consider joining the team, [shoot us an e-mail](mailto:careers@stdlib.com).

You can also follow me, the original author, on Twitter: [@keithwhor](https://twitter.com/keithwhor).

Issues encouraged, PRs welcome, and we're happy to have you on board!
Enjoy and happy building :)

# Thanks

Special thanks to; [AngelPad](https://angelpad.org),
[Brian LeRoux](https://twitter.com/brianleroux),
[Boris Mann](https://twitter.com/bmann),
[TJ Holowaychuk](https://twitter.com/tjholowaychuk)
