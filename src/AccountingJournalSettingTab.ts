import AccountingJournalLedger from "../main";
import { App, PluginSettingTab, Setting, normalizePath } from 'obsidian';

export class AccountingJournalSettingsTab extends PluginSettingTab {
    plugin: AccountingJournalLedger

    constructor(app: App, plugin: AccountingJournalLedger) {
        super(app, plugin);
        this.plugin = plugin;
    }


    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        // Commas As decimal
        new Setting(containerEl)
            .setName('Use comma as decimal separator (European system)')
            .setDesc('If enabled, numbers will use a comma (e.g. 1.103,14) instead of a dot (e.g. 1,103.14) as the decimal separator. This only applies to output formatting; for input, both formats are supported.\nThis setting can be overridden by the frontmatter property: acj-commaAsDecimal')
            .addToggle((tog) =>
                tog
                    .setValue(this.plugin.settings.commaAsDecimal)
                    .onChange(async (value) => {
                        this.plugin.settings.commaAsDecimal = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Journal separator
        new Setting(containerEl)
            .setName('Journal separator')
            .setDesc('Character used to separate the credit and debit columns in the journal. This is used to format the journal entries.\nThis setting can be overridden by the frontmatter property: acj-journalSeparator')
            .addText(text =>
                text
                    .setPlaceholder('-')
                    .setValue(this.plugin.settings.journalSeparator)
                    .onChange(async (value) => {
                        // Changes the settings value
                        this.plugin.settings.journalSeparator = value;
                        await this.plugin.saveSettings();
                    })
            );


        new Setting(containerEl)
            .setName('Default account equivalence file')
            .setDesc('Path to the CSV file in your vault used to resolve account name equivalents.\nThis setting can be overridden by the frontmatter property: acj-accountEquivalence')
            .addText(text =>
                text
                    .setPlaceholder('folder/file.csv')
                    .setValue(this.plugin.settings.defaultEquivCsvPath)
                    .onChange(async (value) => {
                        // Changes the settings value
                        this.plugin.settings.defaultEquivCsvPath = normalizePath(value);

                        await this.plugin.saveSettings();
                        await this.plugin.generateAccountEquivalence();
                    })
            );
    }
}