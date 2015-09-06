###*
 * Stub for Testdriver implementations. This is basically a helper for test-frameworks to run a deployer-js
 * appClass locally.
###
class Testdriver

    _payload: null
    _tmpdirs: null

    ###*
     * create a new testdriver
     * @param  {dirname} payload   some directory with the payload-app structured as specified in the README.
    ###
    constructor: ( payload, logdir = null ) ->
        @_payload = payload
        @_payload += "/" unless @_payload.substring(@_payload.length - 1) is "/"

        buildId = Math.round(Math.random() * 10000)

        logdir ?= "/tmp/deployer.js_log_" + buildId

        @_tmpdirs = {
            app: "/tmp/deployer.js_app_" + buildId
            conf: "/tmp/deployer.js_conf_" + buildId
            data: "/tmp/deployer.js_data_" + buildId
            tmp: "/tmp/deployer.js_tmp_" + buildId
            log: logdir
        }


    ###*
     * do anything that might be required for setting up the scenery, eg starting a service, etc.
    ###
    setUp: ->
        unless @_tmpdirs?
            throw new Error("our tmpdirs are not available yet :|")
        ## create the dirnames from _tmpdirs
        for type, name of @_tmpdirs
            continue if type is 'log'
            if require("fs").existsSync(name)
                throw new Error("something went wrong, tmpdir for #{type} already exists! (#{name})")
            require("fs").mkdirSync(name)
        true


    ###*
     * do anything that might be required for tearing down the scenery, eg stopping a service, etc.
    ###
    tearDown: ->
        return unless @_tmpdirs?
        ## remove the dirnames from _tmpdirs and the debug-log (if it exists)
        for type, name of @_tmpdirs
            continue if type is 'log'
            require("wrench").rmdirSyncRecursive(name) if require("fs").existsSync(name)
        require("fs").unlinkSync(@_tmpdirs.log) if require("fs").existsSync(@_tmpdirs.log)
        true


    ###*
     * acquiring information about how to use the app, this might be the path of an executable,
     * network-host and ports and so on.
     * @return {object}      an object specific to the appClass or 'null' if something went wrong and the
     *                       app cannot be used.
    ###
    getInfo: ->
        {
            type: null
            dirs: @_tmpdirs
        }



module.exports = Testdriver