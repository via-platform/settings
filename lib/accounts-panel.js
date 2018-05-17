"use babel";
/** @jsx etch.dom */

import path from 'path'
import electron from 'electron'
import _ from 'underscore-plus'
import {CompositeDisposable} from 'via'
import etch from 'etch'

import List from './list'
import ListView from './list-view'
import AddAccountModal from './add-account-modal'
import AccountCard from './account-card'

export default class AccountsPanel {
    constructor(settingsView, packageManager){
        this.settingsView = settingsView;
        this.disposables = new CompositeDisposable();
        this.addAccountModal = null;

        etch.initialize(this);

        this.list = new List('name');
        this.view = new ListView(this.list, this.refs.accounts, this.createAccountCard.bind(this));

        this.disposables.add(via.accounts.onDidAddAccount(this.loadAccounts.bind(this)));
        this.disposables.add(via.accounts.onDidDestroyAccount(this.loadAccounts.bind(this)));

        this.disposables.add(via.commands.add(this.element, {
            'core:move-up': () => { this.scrollUp() },
            'core:move-down': () => { this.scrollDown() },
            'core:page-up': () => { this.pageUp() },
            'core:page-down': () => { this.pageDown() },
            'core:move-to-top': () => { this.scrollToTop() },
            'core:move-to-bottom': () => { this.scrollToBottom() }
        }));

        via.accounts.initialize().then(() => this.loadAccounts());
    }

    destroy(){
        if(this.addAccountModal){
            this.addAccountModal.dispose();
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

    createAccountCard(account){
        return new AccountCard(account);
    }

    render(){
        return (
            <div className='panels-item accounts-panel' tabIndex='-1'>
                <div className='section'>
                    <div className='section-container'>
                        <h1 className='section-heading'>Trading Accounts</h1>
                        <div className='accounts-panel-options'>
                            <div className='search-container'>
                                <input type='search' ref='filterEditor' className='input-text native-key-bindings' placeholder='Filter Accounts...' oninput={() => this.matchAccounts()} />
                            </div>
                            <button type='button' className='btn btn-primary add-account-button' onclick={() => this.addAccount()}>Add Trading Account</button>
                        </div>
                        <section className='sub-section'>
                            <h3 className='sub-section-heading'>
                                Linked Accounts
                            </h3>
                            <div ref="accounts" className='container accounts-container'></div>
                        </section>
                    </div>
                </div>
            </div>
        );
    }

    addAccount(){
        if(!this.addAccountModal){
            this.addAccountModal = new AddAccountModal();
        }

        this.addAccountModal.toggle();
    }

    loadAccounts(){
        const accounts = via.accounts.all();
        this.list.setItems(accounts);
        this.matchAccounts();
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
