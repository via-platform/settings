const _ = require('underscore-plus');
const {BufferedProcess, CompositeDisposable, Emitter} = require('via');
const semver = require('semver');

const Client = require('./via-world-client');
const CACHE_EXPIRY = 1000 * 60 * 10;

module.exports = class PackageManager {
    constructor(){
        this.packagePromises = [];
        this.vpmCache = {loadOutdated: {value: null, expiry: 0}};
        this.emitter = new Emitter();
    }

    getClient(){
        if(!this.client){
            this.client = new Client(this);
        }

        return this.client;
    }

    isPackageInstalled(packageName){
        if(via.packages.isPackageLoaded(packageName)){
            return true;
        }else{
            return via.packages.getAvailablePackageNames().indexOf(packageName) > -1;
        }
    }

  packageHasSettings(packageName){
    grammars = via.grammars.getGrammars() ? []
    for grammar in grammars when grammar.path
      return true if(grammar.packageName is packageName)

    pack = via.packages.getLoadedPackage(packageName)
    pack.activateConfig() if(pack? and not via.packages.isPackageActive(packageName))
    schema = via.config.getSchema(packageName)
    schema? and (schema.type isnt 'any')
}

  setProxyServers(callback) =>
    session = via.getCurrentWindow().webContents.session
    session.resolveProxy 'http://via.world', (httpProxy) =>
      this.applyProxyToEnv('http_proxy', httpProxy)
      session.resolveProxy 'https://via.world', (httpsProxy) =>
        this.applyProxyToEnv('https_proxy', httpsProxy)
        callback()
}

  setProxyServersAsync(callback) =>
    httpProxyPromise = via.resolveProxy('http://via.world').then((proxy) => this.applyProxyToEnv('http_proxy', proxy))
    httpsProxyPromise = via.resolveProxy('https://via.world').then((proxy) => this.applyProxyToEnv('https_proxy', proxy))
    Promise.all([httpProxyPromise, httpsProxyPromise]).then(callback)
}

  applyProxyToEnv(envName, proxy){
    if(proxy?)
      proxy = proxy.split(' ')
      switch proxy[0].trim().toUpperCase()
        when 'DIRECT' then delete process.env[envName]
        when 'PROXY'  then process.env[envName] = 'http://' + proxy[1]
    return
}

  runCommand(args, callback){
    command = via.packages.getVpmPath()
    outputLines = []
    stdout = (lines){ outputLines.push(lines)
    errorLines = []
    stderr = (lines){ errorLines.push(lines)
    exit = (code){
      callback(code, outputLines.join('\n'), errorLines.join('\n'))

    args.push('--no-color')

    if(via.config.get('core.useProxySettingsWhenCallingVpm'))
      bufferedProcess = new BufferedProcess({command, args, stdout, stderr, exit, autoStart: false})
      if(via.resolveProxy?)
        this.setProxyServersAsync -> bufferedProcess.start()
      else
        this.setProxyServers -> bufferedProcess.start()
      return bufferedProcess
    else
      return new BufferedProcess({command, args, stdout, stderr, exit})
}

  loadInstalled(callback){
    args = ['ls', '--json']
    errorMessage = 'Fetching local packages failed.'
    vpmProcess = this.runCommand args, (code, stdout, stderr){
      if(code is 0)
        try
          packages = JSON.parse(stdout) ? []
        catch parseError
          error = createJsonParseError(errorMessage, parseError, stdout)
          return callback(error)
        callback(null, packages)
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        callback(error)

    return handleProcessErrors(vpmProcess, errorMessage, callback)

}

  loadFeatured(loadThemes, callback){
    unless callback
      callback = loadThemes
      loadThemes = false

    args = ['featured', '--json']
    version = via.getVersion()
    args.push('--themes') if(loadThemes)
    args.push('--compatible', version) if(semver.valid(version))
    errorMessage = 'Fetching featured packages failed.'

    vpmProcess = this.runCommand args, (code, stdout, stderr){
      if(code is 0)
        try
          packages = JSON.parse(stdout) ? []
        catch parseError
          error = createJsonParseError(errorMessage, parseError, stdout)
          return callback(error)

        callback(null, packages)
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        callback(error)

    return handleProcessErrors(vpmProcess, errorMessage, callback)
}

  loadOutdated(clearCache, callback){
    if(clearCache)
      this.clearOutdatedCache()
    # Short circuit if(we have cached data.)
    else if(this.vpmCache.loadOutdated.value and this.vpmCache.loadOutdated.expiry > Date.now())
      return callback(null, this.vpmCache.loadOutdated.value)

    args = ['outdated', '--json']
    version = via.getVersion()
    args.push('--compatible', version) if(semver.valid(version))
    errorMessage = 'Fetching outdated packages and themes failed.'

    vpmProcess = this.runCommand args, (code, stdout, stderr) =>
      if(code is 0)
        try
          packages = JSON.parse(stdout) ? []
        catch parseError
          error = createJsonParseError(errorMessage, parseError, stdout)
          return callback(error)

        updatablePackages = (pack for pack in packages when not this.getVersionPinnedPackages().includes(pack?.name))

        this.vpmCache.loadOutdated =
          value: updatablePackages
          expiry: Date.now() + this.CACHE_EXPIRY

        for pack in updatablePackages
          this.emitPackageEvent 'update-available', pack

        callback(null, updatablePackages)
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        callback(error)

    return handleProcessErrors(vpmProcess, errorMessage, callback)
}

  getVersionPinnedPackages(){
    via.config.get('core.versionPinnedPackages') ? []
}

  clearOutdatedCache(){
    this.vpmCache.loadOutdated =
      value: null
      expiry: 0
  }

  loadPackage(packageName, callback){
    args = ['view', packageName, '--json']
    errorMessage = "Fetching package '#{packageName}' failed."

    vpmProcess = this.runCommand args, (code, stdout, stderr){
      if(code is 0)
        try
          packages = JSON.parse(stdout) ? []
        catch parseError
          error = createJsonParseError(errorMessage, parseError, stdout)
          return callback(error)

        callback(null, packages)
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        callback(error)

    return handleProcessErrors(vpmProcess, errorMessage, callback)
}

  loadCompatiblePackageVersion(packageName, callback){
    args = ['view', packageName, '--json', '--compatible', this.normalizeVersion(via.getVersion())]
    errorMessage = "Fetching package '#{packageName}' failed."

    vpmProcess = this.runCommand args, (code, stdout, stderr){
      if(code is 0)
        try
          packages = JSON.parse(stdout) ? []
        catch parseError
          error = createJsonParseError(errorMessage, parseError, stdout)
          return callback(error)

        callback(null, packages)
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        callback(error)

    return handleProcessErrors(vpmProcess, errorMessage, callback)
}

    getInstalled(){
        return new Promise((resolve, reject) => {
            return this.loadInstalled((error, result) => {
                if(error){
                    reject(error);
                }else{
                    resolve(result);
                }
            });
        });
    }

    getFeatured(loadThemes){
        return new Promise((resolve, reject) => {
            return this.loadFeatured(!!loadThemes, (error, result) => {
                if(error){
                    reject(error);
                }else{
                    resolve(result);
                }
            });
        });
    }

    getOutdated(clearCache = false){
        return new Promise((resolve, reject) => {
            return this.loadOutdated(clearCache, (error, result) => {
                if(error){
                    reject(error);
                }else{
                    resolve(result);
                }
            });
        });
    }

    getPackage(packageName){
        if(!this.packagePromises[packageName]){
            this.packagePromises[packageName] = new Promise((resolve, reject) => {
                return this.loadPackage (packageName, (error, result){
                    if(error){
                        reject(error);
                    }else{
                        resolve(result);
                    }
                });
            });
        }

        return this.packagePromises[packageName];
    }

    satisfiesVersion(version, metadata){
        let engine = metadata.engines && metadata.engines.atom || '*';
        return semver.validRange(engine) ? semver.satisfies(version, engine) : false;
    }

    normalizeVersion(version){
        if(typeof version === 'string'){
            [version] = version.split('-') ;
        }

        return version;
    }

    search(query, options = {}){
        return new Promise((resolve, reject) => {
            let args = ['search', query, '--json'];

            if(options.themes){
                args.push '--themes';
            }else if(options.packages){
                args.push '--packages';
            }

            let errorMessage = `Searching for \u201C${query}\u201D failed.`;

            let vpmProcess = this.runCommand(args, (code, stdout, stderr) => {
                if(code === 0){
                    try {
                        packages = JSON.parse(stdout) || [];

                        if(options.sortBy){
                            packages = _.sortBy(packages, pkg => -1 * pkg[options.sortBy]);
                        }

                        resolve(packages);
                    }catch(parseError){
                        error = createJsonParseError(errorMessage, parseError, stdout);
                        reject(error);
                    }
                }else{
                    error = new Error(errorMessage);
                    error.stdout = stdout;
                    error.stderr = stderr;
                    reject(error);
                }
            });

            handleProcessErrors(vpmProcess, errorMessage, error => reject(error));
        });
    }

  update(pack, newVersion, callback){
    {name, theme, vpmInstallSource} = pack

    errorMessage = if(newVersion)
      "Updating to \u201C#{name}this.#{newVersion}\u201D failed."
    else
      "Updating to latest sha failed."
    onError = (error) =>
      error.packageInstallError = not theme
      this.emitPackageEvent 'update-failed', pack, error
      callback?(error)

    if(vpmInstallSource?.type is 'git')
      args = ['install', vpmInstallSource.source]
    else
      args = ['install', "#{name}this.#{newVersion}"]

    exit = (code, stdout, stderr) =>
      if(code is 0)
        this.clearOutdatedCache()
        callback?()
        this.emitPackageEvent 'updated', pack
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        onError(error)

    this.emitPackageEvent 'updating', pack
    vpmProcess = this.runCommand(args, exit)
    handleProcessErrors(vpmProcess, errorMessage, onError)
}

  unload(name){
    if(via.packages.isPackageLoaded(name))
      via.packages.deactivatePackage(name) if(via.packages.isPackageActive(name))
      via.packages.unloadPackage(name)
  }

  install(pack, callback){
    {name, version, theme} = pack
    activateOnSuccess = not theme and not via.packages.isPackageDisabled(name)
    activateOnFailure = via.packages.isPackageActive(name)
    nameWithVersion = if(version? then "#{name}this.#{version}" else name)

    this.unload(name)
    args = ['install', nameWithVersion, '--json']

    errorMessage = "Installing \u201C#{nameWithVersion}\u201D failed."
    onError = (error) =>
      error.packageInstallError = not theme
      this.emitPackageEvent 'install-failed', pack, error
      callback?(error)

    exit = (code, stdout, stderr) =>
      if(code is 0)
        # get real package name from package.json
        try
          packageInfo = JSON.parse(stdout)[0]
          pack = _.extend({}, pack, packageInfo.metadata)
          name = pack.name
        catch err
          # using old vpm without --json support
        this.clearOutdatedCache()
        if(activateOnSuccess)
          via.packages.activatePackage(name)
        else
          via.packages.loadPackage(name)

        callback?()
        this.emitPackageEvent 'installed', pack
      else
        via.packages.activatePackage(name) if(activateOnFailure)
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        onError(error)

    this.emitPackageEvent('installing', pack)
    vpmProcess = this.runCommand(args, exit)
    return handleProcessErrors(vpmProcess, errorMessage, onError)
}

  uninstall(pack, callback){
    {name} = pack

    via.packages.deactivatePackage(name) if(via.packages.isPackageActive(name))

    errorMessage = "Uninstalling \u201C#{name}\u201D failed."
    onError = (error) =>
      this.emitPackageEvent 'uninstall-failed', pack, error
      callback?(error)

    this.emitPackageEvent('uninstalling', pack)
    vpmProcess = this.runCommand ['uninstall', '--hard', name], (code, stdout, stderr) =>
      if(code is 0)
        this.clearOutdatedCache()
        this.unload(name)
        this.removePackageNameFromDisabledPackages(name)
        callback?()
        this.emitPackageEvent 'uninstalled', pack
      else
        error = new Error(errorMessage)
        error.stdout = stdout
        error.stderr = stderr
        onError(error)

    handleProcessErrors(vpmProcess, errorMessage, onError)
}

  installAlternative(pack, alternativePackageName, callback){
    eventArg = {pack, alternative: alternativePackageName}
    this.emitter.emit('package-installing-alternative', eventArg)

    uninstallPromise = new Promise (resolve, reject) =>
      this.uninstall pack, (error){
        if(error then reject(error) else resolve())

    installPromise = new Promise (resolve, reject) =>
      this.install {name: alternativePackageName}, (error){
        if(error then reject(error) else resolve())

    Promise.all([uninstallPromise, installPromise]).then =>
      callback(null, eventArg)
      this.emitter.emit('package-installed-alternative', eventArg)
    .catch (error) =>
      console.error error.message, error.stack
      callback(error, eventArg)
      eventArg.error = error
      this.emitter.emit('package-install-alternative-failed', eventArg)
}

  canUpgrade(installedPackage, availableVersion){
    return false unless installedPackage?

    installedVersion = installedPackage.metadata.version
    return false unless semver.valid(installedVersion)
    return false unless semver.valid(availableVersion)

    semver.gt(availableVersion, installedVersion)
}

  getPackageTitle({name}){
    _.undasherize(_.uncamelcase(name))
}

  getRepositoryUrl({metadata}){
    {repository} = metadata
    repoUrl = repository?.url ? repository ? ''
    if(repoUrl.match 'gitthis.github')
      repoName = repoUrl.split(':')[1]
      repoUrl = "https://github.com/#{repoName}"
    repoUrl.replace(/\.git$/, '').replace(/\/+$/, '').replace(/^git\+/, '')
}

  checkNativeBuildTools(){
    new Promise (resolve, reject) =>
      vpmProcess = this.runCommand ['install', '--check'], (code, stdout, stderr){
        if(code is 0)
          resolve()
        else
          reject(new Error())

      vpmProcess.onWillThrowError ({error, handle}){
        handle()
        reject(error)
}

  removePackageNameFromDisabledPackages(packageName){
    via.config.removeAtKeyPath('core.disabledPackages', packageName)
}

  // Emits the appropriate event for the given package.
  //
  // All events are either of the form `theme-foo` or `package-foo` depending on
  // whether the event is for a theme or a normal package. This method standardizes
  // the logic to determine if(a package is a theme or not and formats the event)
  // name appropriately.
  //
  // eventName - The event name suffix {String} of the event to emit.
  // pack - The package for which the event is being emitted.
  // error - Any error information to be included in the case of an error.
  emitPackageEvent(eventName, pack, error){
    theme = pack.theme ? pack.metadata?.theme
    eventName = if(theme then "theme-#{eventName}" else "package-#{eventName}")
    this.emitter.emit(eventName, {pack, error})
}

  on(selectors, callback){
    subscriptions = new CompositeDisposable
    for selector in selectors.split(" ")
      subscriptions.add this.emitter.on(selector, callback)
    subscriptions
}

createJsonParseError = (message, parseError, stdout){
  error = new Error(message)
  error.stdout = ''
  error.stderr = "#{parseError.message}: #{stdout}"
  error
}

createProcessError = (message, processError){
  error = new Error(message)
  error.stdout = ''
  error.stderr = processError.message
  error
}

handleProcessErrors = (vpmProcess, message, callback){
  vpmProcess.onWillThrowError ({error, handle}){
    handle()
    callback(createProcessError(message, error))
}

}
