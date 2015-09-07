Testdriver = require(__dirname + "/../Testdriver")

class CommandDriver extends Testdriver

    _netConfig: null
    _dbConfig: null
    _generatedCertConfigs: null

    _license: null

    constructor: ( payload, logdir = null ) ->
        super(payload, logdir)


    setUp: ->
        @_license = null

        super()
        
        ## recursively copy the 'lib' dir into `app`
        throw new Error("your payload contains no lib/!") unless require("fs").existsSync(@_payload + "lib")
        require("wrench").copyDirSyncRecursive(@_payload + "lib", @_tmpdirs.app + "/lib")

        ## copy the config directory
        throw new Error("your payload contains no conf/!") unless require("fs").existsSync(@_payload + "conf")
        require("wrench").copyDirSyncRecursive(@_payload + "conf", @_tmpdirs.conf, {forceDelete: true})
        
        ## copy the package.json
        unless require("fs").existsSync(@_payload + "package.json")
            throw new Error("your payload contains no package.json!")
        require("fs").writeFileSync(@_tmpdirs.app + "/package.json",
            require("fs").readFileSync(@_payload + "package.json"))
        
        ## copy the license-text
        payloadContents = require("fs").readdirSync(@_payload)
        for file in payloadContents
            if file.substring(0,7) is "LICENSE"
                @_license = file
                break
        unless @_license?
            throw new Error("your payload contains no LICENSE*!")
        require("fs").writeFileSync(@_tmpdirs.app + "/#{@_license}",
            require("fs").readFileSync(@_payload + @_license))

        ## install the required node-modules for production (npm install --production)
        res = require("execSync").run("cd #{@_shellquote(@_tmpdirs.app)} && npm install --production")
        throw new Error("could not install npm deps!") unless res is 0
        
        ## copy the command-runner into `app` (incl src-maps)
        require("fs").writeFileSync(@_tmpdirs.app + "/index.js", "#!/usr/bin/env node\n" +
            require("fs").readFileSync(__dirname + "/runner.js"))
        require("fs").chmodSync(@_tmpdirs.app + "/index.js", '0777')
        require("fs").writeFileSync(@_tmpdirs.app + "/runner.js.map",
            require("fs").readFileSync(__dirname + "/runner.js.map"))
        require("fs").writeFileSync(@_tmpdirs.app + "/cronRunner.js",
            require("fs").readFileSync(__dirname + "/cronRunner.js"))
        require("fs").writeFileSync(@_tmpdirs.app + "/cronRunner.js.map",
            require("fs").readFileSync(__dirname + "/cronRunner.js.map"))
        

        ## create a `runnerConf.json` in `app`
        runnerConf = JSON.stringify({
            dirs: {
                conf: @_tmpdirs.conf + "/"
                tmp: @_tmpdirs.tmp + "/"
            }
        })
        require("fs").writeFileSync(@_tmpdirs.app + "/runnerConf.json", runnerConf)
        
        ## modify the net.config if neccessary
        if require("fs").existsSync(@_tmpdirs.conf + "/net.conf")
            @_netConfig = require("cson").parseSync(
                require("fs").readFileSync(@_tmpdirs.conf + "/net.conf", "utf-8"))
            for proto in ['udp', 'tcp']
                if @_netConfig.ports?[proto]?
                    requiredPorts = []
                    for name, configuredPort of @_netConfig.ports[proto]
                        configuredPort = 8000 if configuredPort <= 1024
                        while true
                            res = require("execSync").run(
                                "test $(netstat -tuln
                                       | grep #{@_shellquote(proto)} | grep #{@_shellquote(configuredPort)}
                                       | wc -l)
                                -eq 0")
                            if res is 0
                                @_netConfig.ports[proto][name] = configuredPort
                                requiredPorts.push(configuredPort)
                                break
                            configuredPort++
                            configuredPort++ while configuredPort in requiredPorts
            if @_generatedCertConfigs?
                for cert, config of @_generatedCertConfigs
                    @_netConfig.ssl[cert] = config
            require("fs").writeFileSync(
                @_tmpdirs.conf + "/net.conf",
                require("cson").stringifySync(@_netConfig),
                "utf-8"
            )
        
        ## read the db.config
        if require("fs").existsSync(@_tmpdirs.conf + "/db.conf")
            @_dbConfig = require("cson").parseSync(
                require("fs").readFileSync(@_tmpdirs.conf + "/db.conf", "utf-8"))

            require("wrench").copyDirSyncRecursive(@_payload + "dbMigrations", @_tmpdirs.app + "/dbMigrations")
            res = require("execSync").run(
                "cd #{@_tmpdirs.app} &&" +
                    " #{__dirname}/../../helpers/updateDb.js '#{JSON.stringify(@_dbConfig)}'"
            )
            throw new Error("could not prepare db!") unless res is 0
        
        true


    getInfo: ->
        info = super()
        info.type = "command"
        info.executable = @_tmpdirs.app + "/index.js"
        info.db = @_dbConfig
        info.net = @_netConfig
        info.license = @_tmpdirs.app + "/" + @_license
        info


    getSslCertsToGenerate: ->
        toGenerate = []
        if require("fs").existsSync(@_payload + "conf/net.conf")
            netConfig = require("cson").parseSync(
                require("fs").readFileSync(@_payload + "conf/net.conf", "utf-8"))
            if netConfig.ssl?
                for name, content of netConfig.ssl
                    unless content.crt?
                        toGenerate.push(name)
        toGenerate


    getConfiguredHostname: ->
        if require("fs").existsSync(@_payload + "conf/net.conf")
            netConfig = require("cson").parseSync(
                require("fs").readFileSync(@_payload + "conf/net.conf", "utf-8"))
            return netConfig.hostname if netConfig.hostname?
        "localhost"


    setGeneratedSslCertConfigs: ( certs ) ->
        @_generatedCertConfigs = certs


    _shellquote: ( toquote ) ->
        require("shell-quote").quote([toquote])


module.exports = CommandDriver
