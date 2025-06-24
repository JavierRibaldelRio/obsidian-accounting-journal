import AccountingJournalPlugin from "../main";
import { App, PluginSettingTab, Setting } from 'obsidian';

export class AccountingJournalSettingsTab extends PluginSettingTab {
    plugin: AccountingJournalPlugin

    constructor(app: App, plugin: AccountingJournalPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }


    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Date format')
            .setDesc('Default date formsat')
            .addToggle((tog) =>
                tog
                    .setValue(this.plugin.settings.commaAsDecimal)
                    .onChange(async (value) => {
                        this.plugin.settings.commaAsDecimal = value;
                        await this.plugin.saveSettings();
                    })
            );
    }
}