instance = null

_saveState = ( instance ) ->
    cacheFile = "/tmp/deployerjs-grunt.state.#{instance._testdriver._payload.replace(/\//g, "_")}"
    state = {
        dirs: instance._testdriver._tmpdirs
        child: null
        generatedCertConfigs: instance._testdriver._generatedCertConfigs
    }
    state.child = instance._testdriver._child.pid if instance._testdriver._child?.pid?
    require("fs").writeFileSync(cacheFile, JSON.stringify(state), "utf-8")

_reset = (payload, dontRemoveLog = false) ->
    cacheFile = "/tmp/deployerjs-grunt.state.#{payload.replace(/\//g, "_")}"
    if require("fs").existsSync(cacheFile)
        state = JSON.parse(require('fs').readFileSync(cacheFile, "utf-8"))
        for type, name of state.dirs
            continue if type is 'log'
            require("wrench").rmdirSyncRecursive(name) if require("fs").existsSync(name)
        if require("fs").existsSync(state.dirs.log) and not dontRemoveLog
            require("fs").unlinkSync(state.dirs.log)
        if state.child?
            childActive = require("fs").existsSync("/proc/" + state.child) and
                (require("fs").readlinkSync("/proc/" + state.child + "/exe") ==
                require("fs").readlinkSync("/proc/self/exe"))
            process.kill(state.child) if childActive
        require("fs").unlinkSync(cacheFile) if require("fs").existsSync(cacheFile)
        return state.generatedCertConfigs
    return {}


_getGeneratedCertConfigs = (payload) ->
    cacheFile = "/tmp/deployerjs-grunt.state.#{payload.replace(/\//g, "_")}"
    if require("fs").existsSync(cacheFile)
        state = JSON.parse(require('fs').readFileSync(cacheFile, "utf-8"))
        return state.generatedCertConfigs
    return {}


_generateCert = ( hostname ) ->
    name = Math.round(Math.random() * 10000)
    try
        cert = require("selfsigned").generate([{ name: "commonName", value: hostname}])
    catch e
        console.error("certificate error", e)
    require("fs").writeFileSync("/tmp/deployerjs.ssl__generated_crt.#{name}", cert.cert, "utf-8")
    require("fs").writeFileSync("/tmp/deployerjs.ssl__generated_key.#{name}", cert.private, "utf-8")
    {
        key: "/tmp/deployerjs.ssl__generated_key.#{name}"
        crt: "/tmp/deployerjs.ssl__generated_crt.#{name}"
    }


module.exports = (grunt) ->

    grunt.registerTask("deploy",
        "deploy your app locally with deployer.js, valid args are setUp|tearDown; infos will be " +
        "written to .deployerjs.info.json",
        (todo) ->
            options = @options({
                payload: null
                appClass: "command"
                logdir: null
                cmdlink: null
            })
            throw new Error("deploy: invalid payload! (#{options})") unless options.payload?
            generatedCertConfigs = _getGeneratedCertConfigs(process.cwd() + "/" + options.payload)
            unless instance?
                generatedCertConfigs = _reset(process.cwd() + "/" + options.payload, options.logdir?)
                instance = new (require(__dirname + "/../Deployer"))(
                    process.cwd() + "/" + options.payload,
                    options.appClass, options.logdir, options.cmdlink)

            toGenerate = instance._testdriver.getSslCertsToGenerate(
                instance._testdriver.getConfiguredHostname())
            for cert in toGenerate
                unless generatedCertConfigs[cert]?
                    certname = cert
                    certname = instance._testdriver.getConfiguredHostname() if certname is 'default'
                    generatedCertConfigs[cert] = _generateCert(certname)
            instance._testdriver.setGeneratedSslCertConfigs(generatedCertConfigs)

            switch todo
                when "setUp"
                    instance.setUp()
                    require("fs").writeFileSync(".deployerjs.info.json",
                        JSON.stringify(instance.getInfo()), "utf-8")
                when "tearDown"
                    instance.tearDown()
                    if require("fs").existsSync(".deployerjs.info.json")
                        require("fs").unlinkSync(".deployerjs.info.json")

            _saveState(instance)
    )
