CommandDriver = require(__dirname + "/../command/index")

class ServiceDriver extends CommandDriver

    _child: null

    constructor: ( payload, logdir = null ) ->
        super(payload, logdir)


    setUp: ->
        super()

        ## override the command-runner in `app` with the service-runner
        require("fs").writeFileSync(@_tmpdirs.app + "/index.js",
            require("fs").readFileSync(__dirname + "/runner.js"))
        require("fs").writeFileSync(@_tmpdirs.app + "/runner.js.map",
            require("fs").readFileSync(__dirname + "/runner.js.map"))

        ## add the log-/datadir and the logger-config to the runnerConf
        runnerConf = JSON.parse(require("fs").readFileSync(@_tmpdirs.app + "/runnerConf.json", "utf-8"))
        runnerConf.dirs.log = @_tmpdirs.log
        runnerConf.dirs.data = @_tmpdirs.data + "/"
        runnerConf.logConfig = {
            src: true
            streams: [
                {
                    level: 'debug',
                    path: runnerConf.dirs.log
                }
            ]
        }
        require("fs").writeFileSync(@_tmpdirs.app + "/runnerConf.json", JSON.stringify(runnerConf))

        ## install the bunyan-logger (npm install )
        res = require("execSync").run(
            "cd #{require("shell-quote").quote([@_tmpdirs.app])}
            && npm install 'git+https://github.com/manuelschneider/node-bunyan.git#master' --production")
        throw new Error("could not install bunyan via npm!") unless res is 0

        ## try to start the service
        @_child = require("child_process").fork("#{@_tmpdirs.app}/index.js", {
            detached: true
        })
        @_child.unref()

        true


    tearDown: ->
        ## stop the service if it is running
        if @_child?
            @_child.kill()
        
        super()


    getInfo: ->
        info = super()
        info.type = "service"
        info.debugLog = @_tmpdirs.log
        info


module.exports = ServiceDriver
