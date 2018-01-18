"use babel";
/** @jsx etch.dom */

import {CompositeDisposable, Disposable} from 'via'
import etch from 'etch'

export default class AccountCard {
    constructor(account){
        this.account = account;
        this.disposables = new CompositeDisposable();

        etch.initialize(this);
    }

    update(){}

    render(){
        const name = this.account.name;
        const status = this.account.status || '';
        const exchange = (this.account.adapter && this.account.adapter.title) ? this.account.adapter.title() : this.account.exchange;

        return (
            <div className='account-card'>
                <div className='body'>
                    <div className='account-title'>
                        <h4 className='account-name'>{this.account.name}</h4>
                        <div className='account-status badge badge-info' ref='accountStatus'>{status}</div>
                    </div>
                    <div className='account-exchange'>{exchange}</div>
                </div>
                <div className='btn-group'>
                    <button type='button' className='btn remove-button' onclick={() => this.remove()}>Remove Account</button>
                </div>
            </div>
        );
    }

    destroy(){
        this.disposables.dispose();
        return etch.destroy(this);
    }

    remove(){
        via.accounts.remove(this.account)
        .catch(error => console.error(`Failed to remove account: ${this.account.name}.`, error.stack != null ? error.stack : error, error.stderr));
    }
}
