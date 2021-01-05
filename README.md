# <img src="https://content.public.files.stdlib.com/shared/static/branding/autocode-logo-wordmark.svg" width="300">
## [Autocode allows you to instantly build and host Webhooks, Scripts and APIs](https://autocode.com)

**Autocode Setup** |
[Node](https://github.com/stdlib/lib-node) |
[Python](https://github.com/stdlib/lib-python) |
[Ruby](https://github.com/stdlib/lib-ruby) |
[Web](https://github.com/stdlib/lib-js)

# Introduction


Autocode is the *fastest, easiest* way to build web services and APIs that
respond to external events. The Autocode CLI allows you to interact seamlessly
with the following components of Autocode:

1. Autocode Standard Library: A central registry for APIs
2. Our scalable, serverless hosting platform

Autocode is based on Function as a Service ("serverless") architecture,
initially popularized by AWS Lambda. You can use Autocode to build modular, scalable APIs
for yourself and other developers in *minutes* without having to manage servers,
gateways, domains, write documentation, or build SDKs. Your development workflow
has never been easier - focus on writing code you love, let Autocode handle
everything else.

Autocode uses an **open specification** called
[FunctionScript](https://github.com/FunctionScript/FunctionScript) for function definitions and
execution. If you run into concerns or questions as you're building from this
guide, please reference the FunctionScript repository. :)

You can view services published by our large and growing developer community
[on the Autocode Standard Library page](https://autocode.com/lib).

![lib-process](https://content.public.files.stdlib.com/shared/static/images/lib-usage.gif)

# Table of Contents

1. [Getting Started](#getting-started)
1. [Creating Your First Service](#creating-your-first-service)
1. [Connecting Service Endpoints](#connecting-service-endpoints)
1. [Accessing Your APIs From Other Applications](#accessing-your-apis-from-other-applications)
1. [Accessing Your APIs Over HTTP](#accessing-your-apis-over-http)
1. [Version Control and Package Management](#version-control-and-package-management)
1. [Logging](#logging)
1. [Additional Functionality](#additional-functionality)
1. [Acknowledgements](#acknowledgements)
1. [Contact](#contact)

# Getting Started

To get started with Autocode, first make sure you have Node 8.x or later installed,
[available from the official Node.js website](https://nodejs.org). Next install
the Autocode CLI tools with:

```
$ npm install lib.cli -g
```

And you're now ready to start building!

# Creating Your First Service

The first thing you'll want to do is create a workspace. Create a new directory
you intend to build your services in and initialize the workspace.

```
$ mkdir autocode-workspace
$ cd autocode-workspace
$ lib init
```

You'll be asked for an e-mail address to log in to the Autocode registry.
If you don't yet have an account, you can create one by going to https://autocode.com/.
Note that you can skip account creation with `lib init --no-login`.
You'll be unable to use the registry, but it's useful for creating workspaces
when you don't have internet access.

Next, create your service:

```
$ lib create <service>
```

You'll be asked for a default function name, which is the entry point
into your service (useful if you only want a single entry point). This will automatically
generate a service project scaffold in `autocode-workspace/<username>/<service>`.

Once created, enter the service directory:

```
$ cd your_username/your_service
```

In this directory, you'll see something like:

```
- functions/
  - __main__.js
- package.json
- env.json
- WELCOME.md
- README.md
```

At this point, there's a "hello world" function that's been automatically
created (`__main__.js`). Autocode comes paired with a simple `lib` command for
testing your functions locally and running them in the cloud.
To test your function:

```shell
$ lib .
"hello world"
```

If we examine the `functions/__main__.js` file, we see the following:

```javascript
/**
* A basic Hello World function
* @param {string} name Who you're saying hello to
* @returns {string}
*/
module.exports = async (name = 'world', context) => {
  return `hello ${name}`;
};
```

We can pass parameters to it using the CLI by specifying named parameters:

```shell
$ lib . --name "dolores abernathy"
"hello dolores abernathy"
```

Note that `context` is a magic parameter (automatically populated with
  execution details, when provided) as is `callback` (terminates execution),
  so these **don't need to be documented** and **can not be specified as
  parameters when executing the function**.

## Pushing to the Cloud

To push your function to a development environment in the cloud...

```shell
$ lib up dev
$ lib your_username.your_service[@dev]
"hello world"
```

And to release it (when you're ready!)

```shell
$ lib release
$ lib your_username.your_service
"hello world"
```

You can check out your service on the web, and use it in applications using our
functions gateway, `api.stdlib.com`.

```
https://your_username.api.stdlib.com/your_service/
```

That's it! You haven't written a line of code yet, and you have mastery over
building a service, testing it in a development (staging) environment online,
and releasing it for private (or public) consumption.

**Note:** By default, APIs that you publish with `lib release` will have a
documentation page in the Autocode public registry. You can keep your page private,
as well as restrict execution access or add collaborators to your API,
by modifying your API's permissions. For more information, see this [docs page](https://docs.stdlib.com/main/#/access-control/api-permissions).

**Another Note:** Staging environments (like the one created with `lib up dev`)
are *mutable* and can be replaced indefinitely. Releases (`lib release`) are
*immutable* and can never be overwritten. However, any service can be torn down
with `lib down <environment>` or `lib down -r <version>` (but releases
	can't be replaced once removed, to prevent mistakes and / or bad actors).

# Connecting Service Endpoints

You'll notice that you can create more than one function per service. While
you can structure your project however you'd like internally, it should also
be noted that these functions have zero-latency access to each other. You
can access them internally with the `lib` [package on NPM](https://github.com/stdlib/lib-node),
which behaves similarly to the `lib` command for testing. Use:

```
$ npm install lib --save
```

In your main service directory to add it, and use it like so:

#### functions/add.js
```javascript
module.exports = async (a = 0, b = 0) => {
  return a + b;
};
```

#### functions/add_double.js
```javascript
const lib = require('lib');

module.exports = async (a = 0, b = 0, context) => {
  let result = await lib[`${context.service.identifier}.add`]({a: a, b: b});
  return result * 2;
};
```

In this case, calling `lib .add --a 1 --b 2` will return `3` and `lib .add_double --a 1 --b 2`
will return `6`. The `context` magic parameter is used for its
`context.service.identifier` property, which will return the string `"your_username.your_service[@local]"`
in the case of local execution, `"your_username.your_service[@ENV]"` when deployed to an
environment or release (where `ENV` is your environment name or semver).

# Accessing Your APIs From Other Applications

As mentioned in the previous section, you can use the NPM `lib` package that's
[available on GitHub and NPM](https://github.com/stdlib/lib-node) to access your
APIs from legacy Node.js applications and even the web browser. We'll
have more SDKs coming out in the following months.

An existing app would call a function (username.bestTrekChar with version 0.2.1):

```javascript
const lib = require('lib');

let result;

try {
  result = await lib.username.bestTrekChar['@0.2.1']({name: 'spock'});
} catch (err) {
  // handle error
}

// do something with result
```

Which would speak to your API...

```javascript
module.exports = async (name = 'kirk') => {

  if (name === 'kirk') {
    return 'why, thank, you, too, kind';
  } else if (name === 'spock') {
    return 'i think this feeling is called "pleased"';
  } else {
    throw new Error('Only kirk and spock supported.');
  }

};
```

# Accessing Your APIs Over HTTP

We definitely recommend using the [lib library on NPM](https://github.com/stdlib/lib-node)
to make API calls as specified above, but you can also make HTTPS
requests directly to the Autocode gateway. HTTP query parameters are mapped
automatically to parameters by name.

```
https://username.api.stdlib.com/liveService@1.12.2/?name=BATMAN
```

Maps directly to:

```javascript
/**
* Hello World
* @param {string} name
* @returns {string}
*/
module.exports = async (name = 'world') => {
  // returns "HELLO BATMAN" from above HTTP query
  return `Hello ${name}`;
};
```

# Version Control and Package Management

A quick note on version control - Autocode is *not* a replacement for normal
git-based workflows, it is a supplement focused around service creation and
execution.

You have unlimited access to any release (that hasn't been torn down)
with `lib download <serviceIdentifier>` to download and unpack the
tarball to a working directory.

Tarballs (and package contents) are *closed-source*.
Nobody but you (and potentially your teammates) has access to these. It's up to
you whether or not you share the guts of your service with others on GitHub or NPM.

As mentioned above: releases are *immutable* and can not be overwritten (but can
	be removed, just not replaced afterwards) and development / staging environments
	are *mutable*, you can overwrite them as much as you'd like.

# Logging

Logging for services is enabled by default. When running a service locally with
`lib .` or `lib .functionname`, all logs will be output in your console. The very
last output (normally a JSON-compatible string) is the return value of the function.

To view remote logs (in dev or release environments), use the following syntax:

```shell
:: Lists all logs for the service
$ lib logs username.servicename

:: Lists main service endpoint logs for "dev" environment
$ lib logs username.servicename[@dev]

:: Lists service endpoint named "test" logs for "dev" environment
$ lib logs username.servicename[@dev].test

:: Lists all logs for "dev" environment
$ lib logs username.servicename[@dev]*
$ lib logs username.servicename[@dev].*
```

The default log type is `stdout`, though you can specify `stderr` with
`lib logs username.servicename -t stderr`.

Limit the number of lines to show with the `-l` argument (or `--lines`).

# Additional Functionality

Autocode comes packed with a bunch of other goodies - as we roll out updates to
the platform the serverless builds we're using may change. You can update
your service to our latest build using `lib rebuild`. If for any reason your
service goes down and is unrecoverable, you can fix it with this command.

To see a full list of commands available for the CLI tools, type:

```
$ lib help
```

We've conveniently copy-and-pasted the output here for you to peruse;

```
*
	-b                   Execute as a Background Function
	-d                   Specify debug mode (prints Gateway logs locally, response logs remotely)
	-i                   Specify information mode (prints tar packing and execution request progress)
	-t                   Specify an Identity Token to use manually
	-x                   Unauthenticated - Execute without a token (overrides active token and -t flag)
	--*                  all verbose flags converted to named keyword parameters

	Runs an Autocode function, i.e. "lib user.service[@env]" (remote) or "lib ." (local)

create [service]
	-n                   No login - don't require an internet connection
	-w                   Write over - overwrite the current directory contents
	--no-login           No login - don't require an internet connection
	--write-over         Write over - overwrite the current directory contents

	Creates a new (local) service

down [environment]
	-r                   Remove a release version (provide number)
	--release            Remove a release version (provide number)

	Removes Autocode package from registry and cloud environment

download [username/name OR username/name@env OR username/name@version]
	-w                   Write over - overwrite the target directory contents
	--write-over         Write over - overwrite the target directory contents

	Retrieves and extracts Autocode package

endpoints:create [name] [description] [param_1] [param_2] [...] [param_n]
	-n                   New directory: Create as a __main__.js file, with the name representing the directory
	--new                New directory: Create as a __main__.js file, with the name representing the directory

	Creates a new endpoint for a service

hostnames:add [source] [target]
	Adds a new hostname route from a source custom hostname to a target service you own.
	Accepts wildcards wrapped in curly braces ("{}") or "*" at the front of the hostname.

hostnames:list
	Displays created hostname routes from source custom hostnames to target services you own

hostnames:remove
	Removes a hostname route from a source custom hostname to a target service you own

http
	-p                   Port (default 8170)
	--port               Port (default 8170)

	Creates HTTP Server for Current Service

init [environment]
	-f                   Force command to overwrite existing workspace
	-n                   No login - don't require an internet connection
	--force              Force command to overwrite existing workspace
	--no-login           No login - don't require an internet connection

	Initializes Autocode workspace

login
	--email              E-mail
	--password           Password

	Logs in to Autocode

logout
	-f                   Force - clears information even if current Access Token invalid
	--force              Force - clears information even if current Access Token invalid

	Logs out of Autocode in this workspace

logs [service]
	-l                   The number of log lines you want to retrieve
	-t                   The log type you want to retrieve. Allowed values are "stdout" and "stderr".
	--lines              The number of log lines you want to retrieve
	--type               The log type you want to retrieve. Allowed values are "stdout" and "stderr".

	Retrieves logs for a given service

rebuild [environment]
	-r                   Rebuild a release package
	--release            Rebuild a release package

	Rebuilds a service (useful for registry performance updates), alias of `lib restart -b`

release
	Pushes release of Autocode package to registry and cloud (Alias of `lib up -r`)

tokens
	Selects an active Identity Token for API Authentication

tokens:add-to-env
	Sets STDLIB_SECRET_TOKEN in env.json "local" field to the value of an existing token

tokens:list
	-a                   All - show invalidated tokens as well
	-s                   Silent mode - do not display information
	--all                All - show invalidated tokens as well
	--silent             Silent mode - do not display information

	Lists your remotely generated Identity Tokens (Authentication)

up [environment]
	-f                   Force deploy
	-r                   Upload a release package
	--force              Force deploy
	--release            Upload a release package

	Pushes Autocode package to registry and cloud environment

user
	-s                   <key> <value> Sets a specified key-value pair
	--new-password       Sets a new password via a prompt
	--reset-password     <email> Sends a password reset request for the specified e-mail address
	--set                <key> <value> Sets a specified key-value pair

	Retrieves (and sets) current user information

version
	Returns currently installed version of Autocode command line tools
```

# Upgrading From Previous Versions

If you're running a previous version and are having issues with the CLI,
try cleaning up the old CLI binary links first;

```
$ rm /usr/local/bin/f
$ rm /usr/local/bin/lib
$ rm /usr/local/bin/stdlib
```

# That's it!

Yep, it's really that easy. To keep up-to-date on developments, please
star us here on GitHub, and sign up a user account for the registry. You
can read more about service hosting and keep track of official updates on
[the official Autocode website, autocode.com](https://autocode.com).

# Acknowledgements

Autocode is a product of and &copy; 2021 Polybit Inc.

We'd love for you to pay attention to [@AutocodeHQ](https://twitter.com/AutocodeHQ) and
what we're building next! If you'd consider joining the team, [shoot us an e-mail](mailto:careers@autocode.com).

You can also follow our team on Twitter:

- [@keithwhor (Keith Horwood)](https://twitter.com/keithwhor)
- [@hacubu (Jacob Lee)](https://twitter.com/hacubu)
- [@YusufMusleh (Yusuf Musleh)](https://twitter.com/YusufMusleh)
- [@threesided (Scott Gamble)](https://twitter.com/threesided)

Issues encouraged, PRs welcome, and we're happy to have you on board!
Enjoy and happy building :)

# Thanks

Special thanks to the people and companies that have believed in and supported our
vision and development over the years.

- Slack [@SlackHQ](https://twitter.com/SlackHQ)
- Stripe [@Stripe](https://twitter.com/Stripe)
- Romain Huet [@romainhuet](https://twitter.com/romainhuet)
- Chad Fowler [@chadfowler](https://twitter.com/chadfowler)
- Brian LeRoux [@brianleroux](https://twitter.com/brianleroux)
- Ahmad Nassri [@AhmadNassri](https://twitter.com/AhmadNassri)

... and many more!
