"use babel";
/** @jsx etch.dom */

import path from 'path'
import etch from 'etch'
import _ from 'underscore-plus'
import {CompositeDisposable, Disposable} from 'via'

import GeneralPanel from './general-panel'
import AccountsPanel from './accounts-panel'
import PackageDetailView from './package-detail-view'
// import KeybindingsPanel from './keybindings-panel'
import InstallPanel from './install-panel'
// import ThemesPanel from './themes-panel'
import InstalledPackagesPanel from './installed-packages-panel'
// import UpdatesPanel from './updates-panel'
import UriHandlerPanel from './uri-handler-panel'
import PackageManager from './package-manager'

module.exports = class SettingsView {
    constructor({uri, packageManager, activePanel} = {}){
        this.uri = uri
        this.packageManager = packageManager
        this.deferredPanel = activePanel
        this.destroyed = false

        etch.initialize(this);
        this.disposables = new CompositeDisposable();

        this.disposables.add(via.commands.add(this.element, {
            'core:move-up':() => { this.scrollUp() },
            'core:move-down':() => { this.scrollDown() },
            'core:page-up':() => { this.pageUp() },
            'core:page-down':() => { this.pageDown() },
            'core:move-to-top':() => { this.scrollToTop() },
            'core:move-to-bottom':() => { this.scrollToBottom() }
        }));

        process.nextTick(() => this.initializePanels())
    }

    update(){}

  destroy(){
    this.destroyed = true
    this.disposables.dispose()
    for(let name in this.panelsByName){
      const panel = this.panelsByName[name]
      panel.destroy()
    }

    return etch.destroy(this)
  }

  render(){
    return(
      <div className='settings-view pane-item' tabIndex='-1'>
        <div className='settings-panels'>
            <div className='settings-menu' ref='menu'>
              <ul className='panels-menu nav' ref='panelMenu'>
                <div className='panel-menu-separator' ref='menuSeparator'></div>
              </ul>
            </div>
            {/* The tabindex attr below ensures that clicks in a panel item won't
            cause this view to gain focus. This is important because when this view
            gains focus(e.g. immediately after via displays it), it focuses the
            currently active panel item. If that focusing causes the active panel to
            scroll(e.g. because the active panel itself passes focus on to a search
            box at the top of a scrolled panel), then the browser will not fire the
            click event on the element within the panel on which the user originally
            clicked(e.g. a package card). This would prevent us from showing a
            package detail view when clicking on a package card. Phew! */}
            <div className='panels' tabIndex='-1' ref='panels'></div>
          </div>
      </div>
    )
  }

  // This prevents the view being actually disposed when closed
  // If you remove it you will need to ensure the cached settingsView
  // in main.coffee is correctly released on close as well...
  onDidChangeTitle(){ return new Disposable() }

  initializePanels(){
    if(this.refs.panels.children.length > 1){
      return
    }

    this.panelsByName = {}
    const clickHandler =(event) => {
      const target = event.target.closest('.panels-menu li a, .panels-packages li a')
      if(target){
        this.showPanel(target.closest('li').name)
      }
    }
    this.element.addEventListener('click', clickHandler)
    this.disposables.add(new Disposable(() => this.element.removeEventListener('click', clickHandler)))

    const focusHandler =() => {
      this.focusActivePanel()
    }
    this.element.addEventListener('focus', focusHandler)
    this.disposables.add(new Disposable(() => this.element.removeEventListener('focus', focusHandler)))

    this.addCorePanel('Core Settings', 'settings',() => new GeneralPanel())
    this.addCorePanel('Trading Accounts', 'accounts',() => new AccountsPanel(this, this.packageManager))
    if(via.config.getSchema('core.uriHandlerRegistration').type !== 'any'){
      // "feature flag" based on core support for URI handling
      this.addCorePanel('URI Handling', 'link',() => new UriHandlerPanel())
    }
    if((process.platform === 'win32') &&(require('via').WinShell != null)){
      const SystemPanel = require('./system-windows-panel')
      this.addCorePanel('System', 'device-desktop',() => new SystemPanel())
    }
    // this.addCorePanel('Keybindings', 'keyboard',() => new KeybindingsPanel())
    this.addCorePanel('Manage Packages', 'packages',() => new InstalledPackagesPanel(this, this.packageManager))
    // this.addCorePanel('Themes', 'paintcan',() => new ThemesPanel(this, this.packageManager))
    // this.addCorePanel('Updates', 'cloud-download',() => new UpdatesPanel(this, this.packageManager))
    this.addCorePanel('Install Packages', 'install',() => new InstallPanel(this, this.packageManager))

    this.showDeferredPanel()

    if(!this.activePanel){
      this.showPanel('Core Settings')
    }
  }

  serialize(){
    return {
      deserializer: 'Settings',
      version: 2,
      activePanel: this.activePanel != null ? this.activePanel : this.deferredPanel,
      uri: this.uri
    }
  }

  getPackages(){
    let bundledPackageMetadataCache
    let left
    if(this.packages != null){ return this.packages }

    this.packages = via.packages.getLoadedPackages()

    try {
      const packageMetadata = require(path.join(via.getLoadSettings().resourcePath, 'package.json'))
      bundledPackageMetadataCache = packageMetadata ? packageMetadata._viaPackages : null
    } catch(error){}

    // Include disabled packages so they can be re-enabled from the UI
    const disabledPackages = via.config.get('core.disabledPackages') || []
    for(const packageName of disabledPackages){
      var metadata
      const packagePath = via.packages.resolvePackagePath(packageName)
      if(!packagePath){
        continue
      }

      try {
        metadata = require(path.join(packagePath, 'package.json'))
      } catch(error){
        if(bundledPackageMetadataCache && bundledPackageMetadataCache[packageName]){
          metadata = bundledPackageMetadataCache[packageName].metadata
        }
      }
      if(metadata == null){
        continue
      }

      const name = metadata.name != null ? metadata.name : packageName
      if(!_.findWhere(this.packages, {name})){
        this.packages.push({name, metadata, path: packagePath})
      }
    }

    this.packages.sort((pack1, pack2) => {
      const title1 = this.packageManager.getPackageTitle(pack1)
      const title2 = this.packageManager.getPackageTitle(pack2)
      return title1.localeCompare(title2)
    })

    return this.packages
  }

  addCorePanel(name, iconName, panel){
    const panelMenuItem = document.createElement('li')
    panelMenuItem.name = name
    panelMenuItem.setAttribute('name', name)

    const a = document.createElement('a')
    a.classList.add('icon', `icon-${iconName}`)
    a.textContent = name
    panelMenuItem.appendChild(a)

    this.refs.menuSeparator.parentElement.insertBefore(panelMenuItem, this.refs.menuSeparator)
    this.addPanel(name, panel)
  }

  addPanel(name, panelCreateCallback){
    if(this.panelCreateCallbacks == null){
      this.panelCreateCallbacks = {}
    }
    this.panelCreateCallbacks[name] = panelCreateCallback
    if(this.deferredPanel && this.deferredPanel.name === name){
      this.showDeferredPanel()
    }
  }

  getOrCreatePanel(name, options){
      // if(name === 'packages') name = 'Manage Packages';
      // if(name === 'install') name = 'Install Packages';

    let panel = this.panelsByName ? this.panelsByName[name] : null
    // These nested conditionals are not great but I feel like it's the most
    // expedient thing to do - I feel like the "right way" involves refactoring
    // this whole file.
    if(!panel){
      let callback = this.panelCreateCallbacks ? this.panelCreateCallbacks[name] : null

      if(options && options.pack && !callback){
        callback =() => {
          if(!options.pack.metadata){
            const metadata = _.clone(options.pack)
            options.pack.metadata = metadata
          }
          return new PackageDetailView(options.pack, this, this.packageManager)
        }
      }

      if(callback){
        panel = callback()
        if(this.panelsByName == null){
          this.panelsByName = {}
        }
        this.panelsByName[name] = panel
        if(this.panelCreateCallbacks){
          delete this.panelCreateCallbacks[name]
        }
      }
    }

    return panel
  }

  makePanelMenuActive(name){
    const previouslyActivePanel = this.refs.menu.querySelector('.active')
    if(previouslyActivePanel){
      previouslyActivePanel.classList.remove('active')
    }

    const newActivePanel = this.refs.menu.querySelector(`[name='${name}']`)
    if(newActivePanel){
      newActivePanel.classList.add('active')
    }
  }

  focusActivePanel(){
    // Pass focus to panel that is currently visible
    for(let i = 0; i < this.refs.panels.children.length; i++){
      const child = this.refs.panels.children[i]
      if(child.offsetWidth > 0){
        child.focus()
      }
    }
  }

  showDeferredPanel(){
    if(this.deferredPanel){
      const {name, options} = this.deferredPanel
      this.showPanel(name, options)
    }
  }

  // Public: show a panel.
  //
  // * `name` {String} the name of the panel to show
  // * `options` {Object} an options hash. Will be passed to `beforeShow()` on
  //   the panel. Options may include(but are not limited to):
  //   * `uri` the URI the panel was launched from
  showPanel(name, options){
    const panel = this.getOrCreatePanel(name, options)
    if(panel){
      this.appendPanel(panel, options)
      this.makePanelMenuActive(name)
      this.setActivePanel(name, options)
      this.deferredPanel = null
    } else {
      this.deferredPanel = {name, options}
    }
  }

  appendPanel(panel, options){
    for(let i = 0; i < this.refs.panels.children.length; i++){
      this.refs.panels.children[i].style.display = 'none'
    }

    if(!this.refs.panels.contains(panel.element)){
      this.refs.panels.appendChild(panel.element)
    }

    if(panel.beforeShow){
      panel.beforeShow(options)
    }
    panel.show()
    panel.focus()
  }

  setActivePanel(name, options = {}){
    this.activePanel = {name, options}
  }

    removePanel(name){
        const panel = this.panelsByName ? this.panelsByName[name] : null;

        if(panel){
            panel.destroy();
            delete this.panelsByName[name];
        }
    }

    getTitle(){
        return 'Settings';
    }

    getURI(){
        return this.uri;
    }

    isEqual(other){
        return other instanceof SettingsView;
    }

    scrollUp(){
        this.element.scrollTop -= document.body.offsetHeight / 20;
    }

    scrollDown(){
        this.element.scrollTop += document.body.offsetHeight / 20;
    }

    pageUp(){
        this.element.scrollTop -= this.element.offsetHeight;
    }

    pageDown(){
        this.element.scrollTop += this.element.offsetHeight;
    }

    scrollToTop(){
        this.element.scrollTop = 0;
    }

    scrollToBottom(){
        this.element.scrollTop = this.element.scrollHeight;
    }
}
