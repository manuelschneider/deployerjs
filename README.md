deployer.js
===========

*Automatically build OS-specific packages for professional app-deployment.*

I believe you can distinguish different classes of applications, which share the same deployment requirements for a specific platform. Therefore it is possible to create some standards for these application classes in order to build platform-specific packages, which enable seamless deployments and (in contrast to foreman/procfiles) a well-defined divide of responsibilities between admins and devs: Devs CI becomes package-maintainer. The whole complexity of running and scaling a big installation is with the ops and their tools (eg puppet, openstack, icinga, ..), possibly supported by some division of devops to maintain the big picture.

In english: Ops can use deb, rpm, pkg, msi and their standard deployment tools/processes instead of mostly for development used tools like npm, gem etc. The dev-team uses git(-submodules), grunt and npm-modules. `deployer.js` on your ci-server takes the part of the package maintainer, which creates a setup similar to the proven upstream<->maintainer->ops known from eg debian.

## Quickstart

    npm install deployerjs

..`Gruntfile.js`:

    grunt.initConfig({
      deployerjs: {
        payload: "dist/",
        appClass: "service"
      }
    });

    grunt.loadNpmTasks('deployerjs');
    grunt.task.run([ 'coffeelint', 'coffee', 'mochaTest', 'deploy:setUp']);

You might set an optional 'logdir' param if you want to pinpoint the bunyan log to some file, so you can throw some `tail -f | bunyan -l debug` on it..

`deploy:setUp` will (re-)start your service. In case of a command you might use the `.deployerjs.info.json`, which is created, to get the executable for testing.


## Supported classes of applications

An application within the scope of deployer.js is not some complex webapp with multiple REST-interfaces, clientcode and background tasks. It's one out of those, tied together (if required) by configuration on the (dev-)ops-side, so the devs can focus on developing and (dev-)ops take care for scaling|monitoring|running the different components.

### Command

A simple executable that is locally available (put in $PATH).

#### Requirements

  * executable
  * tmpdir
  * confdir
  * manpage
  * default crontab (if applicable)

#### Anatomy

    lib
    | index.js
    conf (optional)
    | someAppSpecific.file
    | someOtherAppSpecific.file
    | _somePrivateConfig.file
    | net.conf
    | db.conf
    dbMigrations (optional)
    | 0.js
    | 1.js
    | 2.js
    doc (optional)
    | man.1
    default.cron (optional)
    LICENSE*
    package.json

`lib/index.js` is a commonjs module that will be loaded by some script in eg `/usr/bin/`. It has to implement a specific API (see below). Anything else in lib will simply (recursively) be copied. The command itself will be named after the application name.

`conf` is some directory that will find itself in /etc (or equivalents), you can put cson/json/coffee/js files there with config params. Alternatively it is a textfile with some package name, which means that you want to use the config dir of that package. Config files are never writeable for your application. If you prefix a filename with _, the file will be only readable for your application user (see `Service`) or root, otherwise it is readable for anybody on the system.

`net.conf` and `db.conf` are special files in cson-format with a fixed structure, which might be absent (if you don't need a database or port-bindings) but - if existent - have to comply to the following structure:
  
  * `net.conf` contains

        ## a hostname or ip to listen on and for further usage in the app
        hostname: "my.localhost"

        ## the ports this app requires
        ports:
            tcp:
                arbritraryName0: 80
                arbritraryName1: 443
        
        ## ssl-certificates for this app, the CN is either the hostname (for default) or the name
        ssl:
            default:
                crt: "<absolute-path-to-file>"
                key: "<absolute-path-to-file>"
                ca: "<absolute-path-to-file>" ## optional

    Note that ports are always v4/v6 dualstack, also if your app does not provide one of those, deployer.js (or the admin) will do its (his/her) best to reserve them for you. It is recommended that you provide only defaults for the ports in your net.conf so you can reference the names and leave the rest to deployer.js. For the ssl-configs you may provide 'null' instead of paths so the certificates can be generated at installation.

  * `db.conf` contains

        type: 'mongodb' ## currently supported: 'mongodb'
        host: "localhost"
        port: 27017
        schema: "myApp"
        user: "me" ## optional!
        pw: "someCrypticGeneratedPassword" ## optional

    Provide this file with the credentials to your local test-instance or make sure it doesn't exists if you don't need a database. The specifics of the defined database-connection are overriden when your app is installed.

`dbMigrations` is a dir containing migrations for the database. If it exists, it contains Files specific to the kind of database you have. For SQLish databases these are SQL-Files, for eg mongodb a commonjs-module exporting a function that gets 'db' ('mongodb' database connection) and 'callback' as its only parameter.
If the database has a strict concept of separating administrative users, migrations are performed via the system-wide administrative user. Because, for mongodb such a configuration is completely optional and the models are fully dynamic, the access from db.conf is used for migrations too.  See [simplemigration@github](https://github.com/manuelschneider/simplemigration) for details.

`doc` is some dir that contains the manpages.

`default.cron` is some crontab file, which on debian would be put into /etc/cron.d/packagename. Instead of the last two cols (user & command) you specify which method of the index.js API to run instead of 'run()', example:

    52 6    * * *   runDaily

It'll get the same params as 'run()' and is always run as root (as long as the admin does
not change it).

`package.json` This is equal to npms package.json, see https://npmjs.org/doc/misc/npm-scripts.html. The 'version' field however does not do anything, as well as the 'license' and some other properties. The dependencies are build into the package. This should be considered experimental right now, as lintian complains a lot about the stuff in `node_modules`. Also, the npm-stuff won't get updates unless you (or your ci) create new deployment packages.

`LICENSE*` is a textfile containing the license-text for the app. * might be anything.


##### lib/index.js API


  * `.run(sysDirs, info, netConfig, dbConfig)`, whereas
    - `sysDirs` is an object containing absolute filesystem paths for 'tmp' and 'conf'.
    - `info` contains some info from the package.json, eg 'name', 'description', 'version' (not necessarily the one from the package.json if you're using the cli-param), 'main', urls, ...
    - `netConfig` is an object containing the content of `net.conf` or null if the config is absent
    - `dbConfig` is an object containing the content of `db.conf` or null if the config is absent



### Service

A `Command` that is run as daemon.

#### Requirements

  + `Command`
  + start/stop scripts
  + advanced logging facilities including log-rotating etc..
  + system-level network configuration (ports/ssl)
  + system-level database configuration

#### Anatomy

...the same as for `Command` plus an optional directory `dataMigrations` *tbd* which is similar to dbMigrations in that it contains enumerated js-methods. Only this ones are getting the data-dir of your service to migrate the data in there (also by use of simpleMigration).

By default a service will be started on system boot and stopped on system halt. It is restarted immediately whenever it has been killed but not stopped.

It is run without root-privileges as some systemuser called like the package name, which is also used for the cronjob.

If your app is designed to bind to privileged ports it will require some extra software (in debian this might be 'authbind') to start, this will be figured out automatically based on the `net.conf`.


##### lib/index.js API

  * `.run(sysDirs, info, syslog, netConfig, dbConfig)`, whereas
    - `sysDirs` is an object containing absolute filesystem paths for 'tmp', 'conf' and 'data'. 'data' is some directory with write access for your app where you can do what you want.
    - `info` contains some info from the package.json, eg 'name', 'description', 'version' (not necessarily the one from the package.json if you're using the cli-param), 'main', urls, ...
    - `syslog` is an instance of node-bunyan. It provides the following (trivial) methods: `.trace(msg)`, `.debug(msg)`, `.info(msg)`, `.warn(msg)`, `.error(msg)`, `.fatal(msg)`. In theory you can wire any logging solution up to use these as callbacks, however, I guess most of the time you'll just use them. For further functionality of your node-bunyan instance see [node-bunyan](https://github.com/trentm/node-bunyan).
    By default your service gets 2 logfiles: info (contains anything above or equal to info) and error (contains error/fatal). However, thanks to node-bunyans dtrace integration you can attach yourself to a running service and get all the logs in realtime.
    - `netConfig` is an object containing the content of `net.conf` or null if the config is absent
    - `dbConfig` is an object containing the content of `db.conf` or null if the config is absent
  * `.stop()`, invoked by SIGHUP or by the platforms service manager


### Webapp

> **TBD**

A webroot to be served by some webserver. The config for your favorite webserver is bootstrapped on installation depending on some userinput.

#### Requirements

  + yeoman/angular-template compatible
  + hook for integrating a webservice for static html
  + restrict access to access easily, using the mechanism implemented in lightys modSecDownload.

#### Anatomy

    conf (optional)
      | someAppSpecific.file
      | someOtherAppSpecific.file
      | _somePrivateConfig.file
    service (optional)
    www
      | conf (reserved)

*Note the absence of `conf/db.conf` and `conf/net.conf`!*

`service` contains the `lib/` dir of a `Service`. It *cannot* be configured with a database and its network config is restricted to some http-port. It shares the config-directory with `www` but, in contrast to that, private config files can be read by it.
This enables you to write eg a service that serves static html for example for spiders and integrate it with your js-enabled webapp, or some server-side code to sign something, etc. It is *not* intended for backend-logic of any kind.

`www` is your webroot, `www/conf` is linked with the confdir. Please make sure there is no sensitive information in there (at least in non-private files), as it will be made public.

The webserver will only have read-access on the webroot, it can only deliver it.


## API

Basically you create an instance of Deployer with the payload (the app-structure from above) and a hint what's your apps class.

Then you can call `setUp()`, which 'deploys' your app locally and (in case of a service) fires it up.

Now you can acquire info about how to use it via `getInfo()` or package (and publish) it via `package()`.

To destroy / stop the local deployment call `tearDown()` in the end (or before setting a new version up).


See `Deployer.coffee` for details.


## Supported packaging formats

Currently only maintaining a deb-repo is supported.

However, anything should be possible, from rpm to msi. If someone needs to build for many linux-distros creating specs for suses buildservice or a private instance of obs could be an option too. Even building npm modules, preparing docker-containers or complete vms should be possible.

> **Be careful:** Although building the packages and maintaining the deb-repo with deployerjs works for me, and the code for building production vs development is the same, I'm pretty sure there are still lots of nasty bugs in it. So plz, run a seperate test-installation with the production suite for critical applications on the ops-side, and don't do unattended upgrades there.
