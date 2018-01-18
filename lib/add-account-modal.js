"use babel";
/** @jsx etch.dom */

import _ from 'underscore-plus'
import {CompositeDisposable} from 'via'
import etch from 'etch'
import SettingsPanel from './settings-panel'

export default class AddAccountModal {
    constructor(){
        this.panel = null;
        this.exchange = null;
        this.settings = null;
        this.values = {};
        this.exchanges = new Map();

        for(const exchange of via.packages.getActivePackages().filter(pkg => pkg.metadata.exchange)){
            this.exchanges.set(exchange.name, exchange.mainModule);
        }

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
                <div ref='settings'></div>
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

    initializeExchange(){
        this.exchange = this.refs.schema.value;

        if(this.settings){
            this.settings.destroy();
        }

        this.values = {};

        if(this.exchange){
            this.settings = new SettingsPanel({namespace: `account-schema.${this.exchange}`, values: this.values, includeTitle: false, title: 'Account Details'});
            this.refs.settings.appendChild(this.settings.element);
        }
    }

    confirm(){
        const result = _.clone(this.values);
        const adapter = this.exchanges.get(this.exchange);

        adapter.account(result);
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

        if(this.settings){
            this.settings.destroy();
        }
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

        for(const [name, exchange] of this.exchanges.entries()){
            const title = _.isFunction(exchange.title) ? exchange.title() : name;
            exchanges.push(<option value={name} selected={this.exchange === name}>{title}</option>);
        }

        return exchanges;
    }

    dispose(){
        this.cancel();
        return etch.destroy(this);
    }
}
