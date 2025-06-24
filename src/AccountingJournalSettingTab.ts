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
            .setName('Use comma as decimal separator (European system)')
            .setDesc('If enabled, numbers will use a comma (e.g. 1.103,14) instead of a dot (e.g. 1,103.14) as the decimal separator. This only applies to output formatting; for input, both formats are supported.')
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