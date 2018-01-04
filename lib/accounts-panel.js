"use babel";
/** @jsx etch.dom */

import path from 'path'
import electron from 'electron'
import _ from 'underscore-plus'
import {CompositeDisposable} from 'via'
import etch from 'etch'

import ErrorView from './error-view'
import AddAccountModal from './add-account-modal'

const PackageNameRegex = /config\/install\/(package|theme):([a-z0-9-_]+)/i
import hostedGitInfo from 'hosted-git-info'

export default class AccountsPanel {
  constructor(settingsView, packageManager){
    this.settingsView = settingsView;
    this.packageManager = packageManager;
    this.disposables = new CompositeDisposable();
    this.client = this.packageManager.getClient();
    this.addAccountModal = null;

    etch.initialize(this);

    this.disposables.add(
      this.packageManager.on('package-installed theme-installed', ({pack}) => {
        // const gitUrlInfo =
        //   (this.currentGitPackageCard && this.currentGitPackageCard.pack && this.currentGitPackageCard.pack.gitUrlInfo) ?
        //   this.currentGitPackageCard.pack.gitUrlInfo :
        //   null
        //
        // if (gitUrlInfo && gitUrlInfo === pack.gitUrlInfo) {
        //   this.updateGitPackageCard(pack)
        // }
      })
    )

    // this.disposables.add(via.commands.add(this.refs.search, 'core:confirm', this.performSearch.bind(this)));

    this.disposables.add(via.commands.add(this.element, {
        'core:move-up': () => { this.scrollUp() },
        'core:move-down': () => { this.scrollDown() },
        'core:page-up': () => { this.pageUp() },
        'core:page-down': () => { this.pageDown() },
        'core:move-to-top': () => { this.scrollToTop() },
        'core:move-to-bottom': () => { this.scrollToBottom() }
    }));

    // this.loadFeaturedPackages()
  }

    destroy(){
        if(this.addAccountModal){
            this.addAccountModal.dipose();
        }

        this.disposables.dispose();
        return etch.destroy(this);
    }

    update(){}

    focus(){
        // this.refs.search.focus();
    }

    show(){
        this.element.style.display = '';
    }

    render(){
        return (
            <div className='panels-item accounts-panel' tabIndex='-1'>
                <div className='section'>
                    <div className='section-container'>
                        <h1 className='section-heading'>Manage Trading Accounts</h1>
                        <div className='accounts-panel-options'>
                            <div className='search-container'>
                                <input type='search' ref='filterEditor' className='input-text native-key-bindings' placeholder='Filter Accounts...' oninput={() => this.matchAccounts()} />
                            </div>
                            <button type='button' className='btn btn-info add-account-button' onclick={() => this.addAccount()}>Add Trading Account</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    addAccount(){
        console.log('adding account');
        if(!this.addAccountModal){
            this.addAccountModal = new AddAccountModal(config => {
                console.log('ADDING A NEW ACCOUNT');
                console.log(config);
            });
        }

        this.addAccountModal.toggle();
    }

    matchAccounts(){
        console.log('matching');
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
