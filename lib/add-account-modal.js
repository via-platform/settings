"use babel";
/** @jsx etch.dom */

import _ from 'underscore-plus'
import {CompositeDisposable} from 'via'
import etch from 'etch'
import SettingsPanel from './settings-panel'

const fields = {
    apiKey: 'API Key',
    secret: 'Secret Key',
    uid: 'User ID (UID)',
    login: 'Login',
    password: 'Password'
};

export default class AddAccountModal {
    constructor(){
        this.panel = null;
        this.exchange = null;
        this.settings = [];
        this.values = {};
        this.exchanges = via.exchanges.active();

        etch.initialize(this);
        this.initializeExchange();
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
                        <select className='form-control' ref='schema' onchange={() => this.initializeExchange()}>
                            {this.availableExchanges()}
                        </select>
                    </div>
                </div>
                <form className='section' ref='settings' onsubmit={() => this.confirm()}>
                    {this.renderSettings()}
                </form>
                <div className='section add-account-options'>
                    <button type='button' className='btn btn-info' onclick={() => this.confirm()}>Add Account</button>
                    <button type='button' className='btn' onclick={() => this.cancel()}>Cancel</button>
                </div>
            </div>
        );
    }

    renderSettings(){
        if(!this.exchange) return '';

        const groups = [];

        groups.push(
            <div class='control-group'>
                <div class='controls'>
                    <label class='control-label'>
                        <div class='setting-title'>Name This Account</div>
                    </label>
                    <div class='controls'>
                        <div class='input-container'>
                            <input class='input-text native-key-bindings' type='text' ref='name' />
                        </div>
                    </div>
                </div>
            </div>
        );

        for(const field of this.credentials){
            groups.push(
                <div class='control-group'>
                    <div class='controls'>
                        <label class='control-label'>
                            <div class='setting-title'>{fields[field] || field}</div>
                        </label>
                        <div class='controls'>
                            <div class='input-container'>
                                <input class='input-text native-key-bindings' type='text' ref={field} />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return groups;
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

    initializeExchange(){
        const id = this.refs.schema.value;

        if(id){
            this.exchange = this.exchanges.find(ex => ex.id === id);

            this.credentials = Object.entries(this.exchange.requiredCredentials)
            .filter(([property, value]) => value)
            .map(([property, value]) => property);
        }

        etch.update(this);
    }

    confirm(){
        const credentials = {};

        for(const field of this.credentials){
            const value = this.refs[field].value;

            if(!value){
                this.refs[field].addClass('error');
                return;
            }

            credentials[field] = value;
        }

        via.accounts.add(this.exchange, credentials);
        this.cancel();
    }

    cancel(){
        this.reset();

        if(this.panel != null){
            this.panel.destroy();
        }

        this.panel = null;

        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus();
            this.previouslyFocusedElement = null;
        }
    }

    reset(){
        this.values = {};
        this.exchange = null;
        this.refs.schema.value = '';
    }

    attach(){
        this.previouslyFocusedElement = document.activeElement;

        if(this.panel === null){
            this.panel = via.workspace.addModalPanel({item: this});
        }
    }

    availableExchanges(){
        const exchanges = [
            <option value='' selected={!this.exchange}>Select An Exchange</option>
        ];

        for(const exchange of this.exchanges){
            exchanges.push(<option value={exchange.id} selected={this.exchange && this.exchange.id === exchange.id}>{exchange.name}</option>);
        }

        return exchanges;
    }

    dispose(){
        this.cancel();
        return etch.destroy(this);
    }
}
