const {CompositeDisposable, Disposable} = require('via');
// const PackageManager = require('./package-manager');
const BaseURI = 'via://settings';
const URIRegex = /settings\/([a-z]+)\/?([a-zA-Z0-9_-]+)?/i;
const Settings = require('./settings');

class SettingsPackage {
    activate(){
        this.disposables = new CompositeDisposable();
        this.settings = null;

        via.commands.add('via-workpsace', {
            'settings:open': () => via.desktop.open(BaseURI),
            'settings:core': () => via.desktop.open(`${BaseURI}/core`),
            'settings:editor': () => via.desktop.open(`${BaseURI}/editor`),
            'settings:show-keybindings': () => via.desktop.open(`${BaseURI}/keybindings`),
            'settings:change-themes': () => via.desktop.open(`${BaseURI}/themes`),
            'settings:install-packages-and-themes': () => via.desktop.open(`${BaseURI}/install`),
            'settings:view-installed-themes': () => via.desktop.open(`${BaseURI}/themes`),
            'settings:uninstall-themes': () => via.desktop.open(`${BaseURI}/themes`),
            'settings:view-installed-packages': () => via.desktop.open(`${BaseURI}/packages`),
            'settings:uninstall-packages': () => via.desktop.open(`${BaseURI}/packages`),
            'settings:check-for-package-updates': () => via.desktop.open(`${BaseURI}/updates`)
        });

        this.disposables.add(via.workspace.addOpener(uri => {
            if(uri.startsWith(BaseURI)){
                if(!this.settings || this.settings.destroyed){
                    this.createSettings({uri});
                }

                let match = URIRegex.exec(uri);

                if(match){
                    let panelName = match[1];
                    panelName = panelName[0].toUpperCase() + panelName.slice(1);
                    this.settings.showPanel(panelName, uri);
                }

                return this.settings;
            }
        }));

        if(process.platform === 'win32' && require('via').WinShell){
          via.commands.add('via-workspace', {'settings:system': () => via.workspace.open(`${BaseURI}/system`)});
      }

        unless localStorage.getItem('hasSeenDeprecatedNotification')
          packageManager ?= new PackageManager()
          packageManager.getInstalled().then (packages) =>
            this.showDeprecatedNotification(packages) if packages.user?.length
    }

    deactivate(){
        this.disposables.dispose();
        this.disposables = null;
    }

    createSettings(params){
        // if(!this.packageManager){
        //     this.packageManager = new PackageManager();
        // }
        //
        // params.packageManager = this.packageManager;
        this.settings = new Settings(params);

        return this.settings;
    }
}

module.exports = new SettingsPackage();
