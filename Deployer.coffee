###*
 * Deployer.js, see the README.
###
class Deployer

    _testdriver: null
    _cmdLink: null

    appClass: null
    payload: null

    _running: false

    ###*
     * create a new deployer-instance
     * @param  {dirname} payload  some directory with the payload-app structured as specified in the README.
     * @param  {enum;values:['command', 'service']}   appClass
     * @param  {fspath} logdir   where to put logs, if ommitted a dir is created. This might be useful if
     *                           you are developing an application and you want to keep a `tail -f` running.
     * @param  {fspath} cmdlink  if set, this maintains a symlink to your command. This might be useful if
     *                           you are developing an application and you simply want to hit arrow-up to
     *                           try the command again.
    ###
    constructor: ( @payload, appClass, logdir = null, cmdlink = null ) ->
        @_cmdLink = cmdlink
        @appClass = appClass
        @_testdriver = new (require(__dirname + "/testdriver/#{appClass.toLowerCase()}/index"))(@payload,
            logdir)



    ###*
     * do anything that might be required for setting up the scenery, eg create all required dirs, start
     * a service, etc.
    ###
    setUp: ->
        if @_cmdLink?
            try
                exists = require("fs").lstatSync(@_cmdLink)
            catch e
                exists = null
            require("fs").unlinkSync(@_cmdLink) if exists
        @_testdriver.setUp()
        @_running = true
        if @appClass is 'command' and @_cmdLink?
            info = @getInfo()
            require("fs").symlinkSync(info.executable, @_cmdLink)

    ###*
     * do anything that might be required for tearing down the scenery, eg clear all required dirs, stop
     * a service, etc.
    ###
    tearDown: ->
        @_running = false
        @_testdriver.tearDown()

        if @_cmdLink?
            try
                exists = require("fs").lstatSync(@_cmdLink)
            catch e
                exists = null
            require("fs").unlinkSync(@_cmdLink) if exists


    ###*
     * acquiring information about how to use the app, this might be the path of an executable,
     * network-host and ports and so on.
     * @return {object}      an object specific to the appClass or 'null' if something went wrong and the
     *                       app cannot be used.
     *                       For a command it contains:
     *                           * type: 'command'
     *                           * executable: '/path/to/bin'
     *                           * db: the (possibly modified) db-config currently in use
     *                           * net: the (possibly modified) net-config currently in use
     *                           * license: '/path/to/license'
     *                           * dirs: {
     *                               app: '/path/to'
     *                               conf: '/path/to'
     *                               data: '/path/to'
     *                               tmp: '/path/to'
     *                               log: '/path/to'
     *                             }
     *                       For a service change/add
     *                           * type: 'service'
     *                           * debugLog: '/path/to/dir/'
    ###
    getInfo: ->
        return null unless @_running
        @_testdriver.getInfo()


    ###*
     * package (and publish) the current payload
     * @param  {callback}       done        a callback that is called when the action completed
     * @param  {array;contains:object(props: {
     *             'version': semver,
     *             'date': timestamp,
     *             'stable': bool,
     *             'changes': array(contains: object(props: {
     *                 gitref: commitId
     *                 description: text(maxLines: 1)
     *             }))
     *         })}              changelog
     * @param  {enum;values:[]} type        deb, msi, npm, ...
     * @param  {null|object}    publishTo   type-specific object with info about eg the location of a local
     *                                      deb-repo.
     *                                      for type 'deb' this is:
     *                                          * path: '/path/to/repo'
     *                                      if it doesn't exists, a new deployer-js compatible repo is
     *                                      bootstrapped there.
     * @param  {null|object}    buildOpts   type-specific object with info that might be required for the
     *                                      build.
     *                                      for type 'deb' this is:
     *                                          * packager: {
     *                                              name: "some guy", mail: "guy@somethingWithGpg.de"
     *                                            }
    ###
    package: ( done, changelog, type = "deb", publishTo = null, buildOpts = null ) ->
        unless @_running
            done(new Error("plz call setUp() first!"))
            return
        Packager = new (require(__dirname + "/packager/#{type}/index"))(@payload, @appClass, @getInfo())
        Packager.package((( done, publishTo, buildOpts, Packager, packagePath ) ->
            if packagePath instanceof Error
                done(packagePath)
                return
            if Packager.publish? and publishTo?
                Packager.publish(done, publishTo, packagePath, buildOpts)
            else
                done(packagePath)
        ).bind(null, done, publishTo, buildOpts, Packager), changelog, buildOpts)


module.exports = Deployer