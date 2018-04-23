const {CompositeDisposable, Disposable} = require('via');

const SettingsView = require('./settings-view');
let settingsView = null

const BaseURI = 'via://settings';
const URIRegex = /settings\/([a-z]+)\/?([a-zA-Z0-9_-]+)?/i;

const PackageManager = require('./package-manager');
let packageManager = null;

const openPanel = (settingsView, panelName, uri) => {
    const match = URIRegex.exec(uri);

    const options = {uri};

    if(match){
        const panel = match[1];
        const detail = match[2];

        if(panel === 'packages' && detail != null){
            panelName = detail;
            options.pack = {name: detail};

            if(via.packages.getLoadedPackage(detail)){
                options.back = 'Packages';
            }
        }
    }

    settingsView.showPanel(panelName, options);
}

class SettingsPackage {
    activate(){
        this.disposables = new CompositeDisposable();
        this.settings = null;

        via.commands.add('via-workspace', {
            'settings:open': () => via.workspace.open(BaseURI),
            'settings:core': () => via.workspace.open(`${BaseURI}/core`),
            'settings:manage-exchanges': () => via.workspace.open(`${BaseURI}/exchanges`),
            'settings:manage-accounts': () => via.workspace.open(`${BaseURI}/accounts`),
            'settings:install-packages': () => via.workspace.open(`${BaseURI}/install`),
            'settings:manage-packages': () => via.workspace.open(`${BaseURI}/packages`)
        });

        this.disposables.add(via.workspace.addOpener(uri => {
            if(uri.startsWith(BaseURI)){
                if(!settingsView || settingsView.destroyed){
                    settingsView = this.createSettingsView({uri});
                }

                let match = URIRegex.exec(uri);

                if(match){
                    let panelName = match[1];
                    // panelName = panelName[0].toUpperCase() + panelName.slice(1);
                    openPanel(settingsView, panelName, uri);
                }

                return settingsView;
            }
        }));

        if(process.platform === 'win32' && require('via').WinShell){
            via.commands.add('via-workspace', {
                'settings:system': () => via.workspace.open(`${BaseURI}/system`
            )});
        }

        if(!localStorage.getItem('hasSeenDeprecatedNotification')){
            if(packageManager == null){
                packageManager = new PackageManager();
            }

            packageManager.getInstalled().then(packages => {
                if(packages.user && packages.user.length){
                    this.showDeprecatedNotification(packages);
                }
            });
        }
    }

    deactivate(){
        this.disposables.dispose();
        this.disposables = null;
    }

    showPackage(packageName) {
        via.workspace.open(`${BaseURI}/packages/${packageName}`);
    }

    createSettingsView(params) {
        if(SettingsView == null) SettingsView = require('./settings-view');
        if(packageManager == null) packageManager = new PackageManager();
        params.packageManager = packageManager;
        settingsView = new SettingsView(params);
        return settingsView;
    }

    showDeprecatedNotification(packages) {
        localStorage.setItem('hasSeenDeprecatedNotification', true);

        const deprecatedPackages = packages.user.filter(({name, version}) => via.packages.isDeprecatedPackage(name, version));

        if (!deprecatedPackages.length) return;

        let were = 'were';
        let have = 'have';
        let packageText = 'packages';

        if (packages.length === 1) {
            packageText = 'package';
            were = 'was';
            have = 'has';
        }

        const notification = via.notifications.addWarning(
            'Deprecated Packages',
            `${deprecatedPackages.length} ${packageText} ${have} deprecations and ${were} not loaded.`,
            {
                description: 'This message will show only one time. Deprecated packages can be viewed in the settings view.',
                detail: (deprecatedPackages.map(pack => pack.name)).join(', '),
                dismissable: true,
                buttons: [{
                    text: 'View Packages',
                    onDidClick: () => {
                        via.commands.dispatch(via.views.getView(via.workspace), 'settings:manage-packages');
                        notification.dismiss();
                    }
                }]
            }
        );
    }
}

module.exports = new SettingsPackage();
