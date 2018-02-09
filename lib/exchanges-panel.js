"use babel";
/** @jsx etch.dom */

import {CompositeDisposable, Disposable} from 'via'
import etch from 'etch'
import SettingsPanel from './settings-panel'

export default class ExchangesPanel {
  constructor () {
    etch.initialize(this)
    this.subscriptions = new CompositeDisposable()
    this.subscriptions.add(via.commands.add(this.element, {
      'core:move-up': () => { this.scrollUp() },
      'core:move-down': () => { this.scrollDown() },
      'core:page-up': () => { this.pageUp() },
      'core:page-down': () => { this.pageDown() },
      'core:move-to-top': () => { this.scrollToTop() },
      'core:move-to-bottom': () => { this.scrollToBottom() }
    }))
  }

  destroy () {
    this.subscriptions.dispose()
    return etch.destroy(this)
  }

  update () {}

  render () {
    return (
      <div tabIndex='0' className='panels-item'>
        <SettingsPanel
          ref='panel'
          namespace='exchange'
          icon='settings'
          note={`
              <div class="text" id="core-settings-note" tabindex="-1">
                  Toggle items on this panel to activate or deactivate trading on the desired exchanges.
                  If you are trying to add or remove trading accounts, do so from the "Trading Accounts" tab.
                  <br />
                  <br />
                  Please note: different exchanges may have different features available. To see the current feature status, please check https://via.world/exchanges.
              </div>
          `} />
      </div>
    )
  }

  focus () {
    this.element.focus()
  }

  show () {
    this.element.style.display = ''
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
