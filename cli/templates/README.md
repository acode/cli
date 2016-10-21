# Your stdlib service: {{username}}/{{service}}

This is the README for your service.

A few notes;

`package.json` is NPM-compatible and contains some stdlib configuration details.
`.gitignore` has also been provided for your convenience.

# package.json

This is a standard `package.json`. You'll notice an additional `"stdlib"` field.
You can configure your service for the stdlib registry using;

`name` - The name to register on stdlib, in the format of `<username>/<service>`.
In order to compile to the registry you must have permission to compile to the
provided username's account.

`defaultFunction` - Execute if provided no function route (root service).
If not specified, your base service route will provide a list of available
functions in JSON format.

`timeout` - The time in ms at which to kill service execution. Free accounts are
limited to 30 seconds (30000).

`publish` - Whether to publish releases (versioned) to the stdlib public
  directory. Packages pushed to the registry in non-release environments will
  never be published.

# env.json

Environment configuration for your service. Each top level key (i.e.
  `"dev"` and `"release"`) specifies their own set of key-value
  pairs for a specific execution environment. The keys and values specified
  are automatically added to the `process.env` variable in Node.js.

`"dev"` is the *non-configurable* name of the local environment, but can
also be used as an environment name for compilation
(i.e. `$ stdlib up development`).

`"release"` is the *non-configurable* name of the production environment when
you create releases with `$ stdlib release`.

You can add additional environments and key-value pairs, and use them for
compilation with `stdlib up <environment>`. Note that free accounts are
restricted to one compilation environment (aside from `"release"`).

*We recommend against checking this file in to version control*. It will be
saved with your tarball and is privately retrievable from the stdlib registry
using your account credentials. It has been added to `.gitignore` by default.

# f/{{func}}/function.json

This is your function definition file. The following fields can be used for
execution configuration of specific functions within your service.

`name` - The function name. This maps to an execution route over HTTP. For
example, `{{username}}/{{service}}/{{func}}` would map to the first
function you've created.

`description` - A brief description of the function. To provide detailed
information about function execution, overwrite this README.

`args` - An `Array` describing each argument as you expect them to be passed to
`params.args`.

`kwargs` - An `Object` describing each keyword argument as you expect them to be
passed to `params.kwargs`

`http` - Information to provide to function requests over HTTP.

`http.headers` - HTTP headers to return in the response. Examples are
`"Content-Type"` to specify file type if your function returns a `Buffer` or
`"Access-Control-Allow-Origin"` to restrict browser-based function requests.

# f/{{func}}/index.js

The entry point to your function described in `f/{{func}}/function.json`.
This is *non-configurable*. You may add as many subdirectories and supportive
files as you like, but `index.js` will remain the entry point and *must*
export a function to be active.
