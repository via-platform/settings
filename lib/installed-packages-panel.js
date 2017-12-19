"use jsx";

import {CompositeDisposable} from 'via'
import etch from 'etch'
import fuzzaldrin from 'fuzzaldrin'

import CollapsibleSectionPanel from './collapsible-section-panel'
import PackageCard from './package-card'
import ErrorView from './error-view'

import List from './list'
import ListView from './list-view'
import {ownerFromRepository, packageComparatorAscending} from './utils'

export default class InstalledPackagesPanel extends CollapsibleSectionPanel {
  static loadPackagesDelay () {
    return 300
  }

  constructor (settingsView, packageManager) {
    super()
    etch.initialize(this)
    this.settingsView = settingsView
    this.packageManager = packageManager
    this.items = {
      dev: new List('name'),
      core: new List('name'),
      user: new List('name'),
      git: new List('name'),
      deprecated: new List('name')
    }
    this.itemViews = {
      dev: new ListView(this.items.dev, this.refs.devPackages, this.createPackageCard.bind(this)),
      core: new ListView(this.items.core, this.refs.corePackages, this.createPackageCard.bind(this)),
      user: new ListView(this.items.user, this.refs.communityPackages, this.createPackageCard.bind(this)),
      git: new ListView(this.items.git, this.refs.gitPackages, this.createPackageCard.bind(this)),
      deprecated: new ListView(this.items.deprecated, this.refs.deprecatedPackages, this.createPackageCard.bind(this))
    }

    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(
      this.packageManager.on('package-install-failed theme-install-failed package-uninstall-failed theme-uninstall-failed package-update-failed theme-update-failed', ({pack, error}) => {
        this.refs.updateErrors.appendChild(new ErrorView(this.packageManager, error).element)
      })
    )

    let loadPackagesTimeout
    this.subscriptions.add(
      this.packageManager.on('package-updated package-installed package-uninstalled package-installed-alternative', () => {
        clearTimeout(loadPackagesTimeout)
        loadPackagesTimeout = setTimeout(this.loadPackages.bind(this), InstalledPackagesPanel.loadPackagesDelay())
      })
    )

    this.subscriptions.add(this.handleEvents())
    this.subscriptions.add(via.commands.add(this.element, {
      'core:move-up': () => { this.scrollUp() },
      'core:move-down': () => { this.scrollDown() },
      'core:page-up': () => { this.pageUp() },
      'core:page-down': () => { this.pageDown() },
      'core:move-to-top': () => { this.scrollToTop() },
      'core:move-to-bottom': () => { this.scrollToBottom() }
    }))

    this.loadPackages()
  }

  focus () {
    this.refs.filterEditor.focus()
  }

  show () {
    this.element.style.display = ''
  }

  destroy () {
    this.subscriptions.dispose()
    return etch.destroy(this)
  }

  update () {}

  render () {
    return (
      <div className='panels-item packages-panel' tabIndex="-1">
        <section className='section'>
          <div className='section-container'>
            <div className='section-heading icon icon-package'>
              Installed Packages
            </div>
            <div className='search-container'>
                <input type='search' ref='filterEditor' className='input-text native-key-bindings' placeholder='Filter Packages...' oninput={() => this.matchPackages()} />
            </div>

            <div ref='updateErrors'></div>

            <section ref='deprecatedSection' className='sub-section deprecated-packages'>
              <h3 ref='deprecatedPackagesHeader' className='sub-section-heading icon icon-package'>
                Deprecated Packages
              </h3>
              <p>Via does not load deprecated packages. These packages may have updates available.</p>
              <div ref='deprecatedPackages' className='container package-container'>
                <div ref='deprecatedLoadingArea' className='alert alert-info loading-area icon icon-hourglass'>Loading packages…</div>
              </div>
            </section>

            <section className='sub-section installed-packages'>
              <h3 ref='communityPackagesHeader' className='sub-section-heading icon icon-package'>
                Community Packages
              </h3>
              <div ref='communityPackages' className='container package-container'>
                <div ref='communityLoadingArea' className='alert alert-info loading-area icon icon-hourglass'>Loading packages…</div>
              </div>
            </section>

            <section className='sub-section core-packages'>
              <h3 ref='corePackagesHeader' className='sub-section-heading icon icon-package'>
                Core Packages
              </h3>
              <div ref='corePackages' className='container package-container'>
                <div ref='coreLoadingArea' className='alert alert-info loading-area icon icon-hourglass'>Loading packages…</div>
              </div>
            </section>

            <section className='sub-section dev-packages'>
              <h3 ref='devPackagesHeader' className='sub-section-heading icon icon-package'>
                Development Packages
              </h3>
              <div ref='devPackages' className='container package-container'>
                <div ref='devLoadingArea' className='alert alert-info loading-area icon icon-hourglass'>Loading packages…</div>
              </div>
            </section>

            <section className='sub-section git-packages'>
              <h3 ref='gitPackagesHeader' className='sub-section-heading icon icon-package'>
                Git Packages
              </h3>
              <div ref='gitPackages' className='container package-container'>
                <div ref='gitLoadingArea' className='alert alert-info loading-area icon icon-hourglass'>Loading packages…</div>
              </div>
            </section>
          </div>
        </section>
      </div>
    )
  }

  filterPackages (packages) {
    packages.dev = packages.dev.filter(({theme}) => !theme)
    packages.user = packages.user.filter(({theme}) => !theme)
    packages.deprecated = packages.user.filter(({name, version}) => via.packages.isDeprecatedPackage(name, version))
    packages.core = packages.core.filter(({theme}) => !theme)
    packages.git = (packages.git || []).filter(({theme}) => !theme)

    for (let pack of packages.core) {
      if (pack.repository == null) {
        pack.repository = `https://github.com/via/${pack.name}`
      }
    }

    for (let packageType of ['dev', 'core', 'user', 'git', 'deprecated']) {
      for (let pack of packages[packageType]) {
        pack.owner = ownerFromRepository(pack.repository)
      }
    }

    return packages
  }

  sortPackages (packages) {
    packages.dev.sort(packageComparatorAscending)
    packages.core.sort(packageComparatorAscending)
    packages.user.sort(packageComparatorAscending)
    packages.git.sort(packageComparatorAscending)
    packages.deprecated.sort(packageComparatorAscending)
    return packages
  }

  loadPackages () {
    const packagesWithUpdates = {}
    this.packageManager.getOutdated().then((packages) => {
      for (let {name, latestVersion} of packages) {
        packagesWithUpdates[name] = latestVersion
      }
      this.displayPackageUpdates(packagesWithUpdates)
    })

    this.packageManager.getInstalled().then((packages) => {
      this.packages = this.sortPackages(this.filterPackages(packages))
      this.refs.devLoadingArea.remove()
      this.items.dev.setItems(this.packages.dev)

      this.refs.coreLoadingArea.remove()
      this.items.core.setItems(this.packages.core)

      this.refs.communityLoadingArea.remove()
      this.items.user.setItems(this.packages.user)

      this.refs.gitLoadingArea.remove()
      this.items.git.setItems(this.packages.git)

      if (this.packages.deprecated.length) {
        this.refs.deprecatedSection.style.display = ''
      } else {
        this.refs.deprecatedSection.style.display = 'none'
      }
      this.refs.deprecatedLoadingArea.remove()
      this.items.deprecated.setItems(this.packages.deprecated)

      // TODO show empty mesage per section

      this.displayPackageUpdates(packagesWithUpdates)

      this.matchPackages()
    }).catch((error) => {
      console.error(error.message, error.stack)
    })
  }

  displayPackageUpdates (packagesWithUpdates) {
    for (const packageType of ['dev', 'core', 'user', 'git', 'deprecated']) {
      for (const packageCard of this.itemViews[packageType].getViews()) {
        const newVersion = packagesWithUpdates[packageCard.pack.name]
        if (newVersion) {
          packageCard.displayAvailableUpdate(newVersion)
        }
      }
    }
  }

  createPackageCard (pack) {
    return new PackageCard(pack, this.settingsView, this.packageManager, {back: 'Manage Packages'})
  }

  filterPackageListByText (text) {
    if (!this.packages) {
      return
    }

    for (let packageType of ['dev', 'core', 'user', 'git', 'deprecated']) {
      const allViews = this.itemViews[packageType].getViews()
      const activeViews = this.itemViews[packageType].filterViews((pack) => {
        if (text === '') {
          return true
        } else {
          const owner = pack.owner != null ? pack.owner : ownerFromRepository(pack.repository)
          const filterText = `${pack.name} ${owner}`
          return fuzzaldrin.score(filterText, text) > 0
        }
      })

      for (const view of allViews) {
        if (view) {
          view.element.parentElement.style.display = 'none'
          view.element.parentElement.classList.add('hidden')
        }
      }

      for (const view of activeViews) {
        if (view) {
          view.element.parentElement.style.display = ''
          view.element.parentElement.classList.remove('hidden')
        }
      }
    }
  }

  resetSectionHasItems() {
    this.resetCollapsibleSections([this.refs.deprecatedPackagesHeader, this.refs.communityPackagesHeader, this.refs.corePackagesHeader, this.refs.devPackagesHeader, this.refs.gitPackagesHeader])
  }

  matchPackages () {
    this.filterPackageListByText(this.refs.filterEditor.value)
  }

  scrollUp () {
    this.element.scrollTop -= document.body.offsetHeight / 20
  }

  scrollDown () {
    this.element.scrollTop += document.body.offsetHeight / 20
  }

  pageUp () {
    this.element.scrollTop -= this.element.offsetHeight
  }

  pageDown () {
    this.element.scrollTop += this.element.offsetHeight
  }

  scrollToTop () {
    this.element.scrollTop = 0
  }

  scrollToBottom () {
    this.element.scrollTop = this.element.scrollHeight
  }
}
