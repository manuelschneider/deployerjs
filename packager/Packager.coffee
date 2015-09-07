class Packager

    payload: null
    appClass: null
    deploymentInfo: null

    constructor: ( @payload, @appClass, @deploymentInfo ) ->


    package: ( done, changelog ) ->
        done(new Error("not yet implemented"))


    # publish: ( done, publishTo, packagePath ) -> // optional


module.exports = Packager