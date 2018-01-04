"use babel";
/** @jsx etch.dom */

import _ from 'underscore-plus'
import {CompositeDisposable} from 'via'
import etch from 'etch'
import SettingsPanel from './settings-panel'

export default class AddAccountModal {
    constructor(callback){
        this.callback = callback;
        this.panel = null;
        this.values = {};
        etch.initialize(this);
    }

    update(){}

    render(){
        return (
            <div className='add-account-modal'>
                <div className='section'>
                    <div className='block section-heading'>
                        Select an Exchange
                    </div>
                    <div className='account-selection'>
                        <select className='form-control' ref='schema'>
                            {this.availableAccounts()}
                        </select>
                    </div>
                </div>
                <SettingsPanel ref='panel' namespace='account-schema.gdax' values={this.values} includeTitle={false} title='GDAX Account Details' />
                <div className='section add-account-options'>
                    <button type='button' className='btn btn-info' onclick={() => this.confirm()}>Add Account</button>
                    <button type='button' className='btn' onclick={() => this.cancel()}>Cancel</button>
                </div>
            </div>
        );
    }

    async toggle(){
        if(this.panel != null){
            this.cancel();
        }else{
            // this.currentProjectName = via.project != null ? this.makeName(via.project.getPaths()) : null
            // const projects = via.history.getProjects().map(p => ({ name: this.makeName(p.paths), value: p.paths }))
            // await this.selectListView.update({items: projects})
            this.attach();
        }
    }

    confirm(){
        console.log('Confirming');
        console.log(this.values);
        this.cancel();
        this.callback(this.values);
    }

    cancel(){
        if(this.panel != null){
            this.panel.destroy();
        }

        this.panel = null;

        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus();
            this.previouslyFocusedElement = null;
        }
    }

    attach(){
        this.previouslyFocusedElement = document.activeElement;

        if(this.panel === null){
            this.panel = via.workspace.addModalPanel({item: this});
        }
    }

    availableAccounts(){
        const accounts = via.packages.getActivePackages().filter(pkg => pkg.metadata.exchange);

        console.log(accounts);

        return accounts.map(account => {
            const title = _.isFunction(account.mainModule.title) ? account.mainModule.title() : account.name;

            return (
                <option value={account.name}>{title}</option>
            );
        });
    }

    dispose(){
        this.cancel();
        return etch.destroy(this);
    }
}
