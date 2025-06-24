import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { AccountingJournalSettingsTab } from 'src/AccountingJournalSettingTab';
import type { accountEquivalent } from 'types/accountingTypes';
import { AccountingTransformer } from 'utils/AccountingTransformer';
import pgcDataJson from './assets/PGC-2017.json';

const pgcData: accountEquivalent = pgcDataJson as accountEquivalent;




interface AccountingJournalPluginSettings {
	commaAsDecimal: boolean;
}

const DEFAULT_SETTINGS: AccountingJournalPluginSettings = {
	commaAsDecimal: false
};

export default class AccountingJournalPlugin extends Plugin {

	settings: AccountingJournalPluginSettings

	async onload() {

		// Configure settings
		await this.loadSettings();

		// Accountability Journal, Diary Book (Libro diario)
		this.registerMarkdownCodeBlockProcessor('acj', (source, el, ctx) => {

			// Check if is commaAsDecimal is overriden by local config through props
			const commaAsDecimalJournal: boolean = this.getCommaAsDecimal()

			console.log(commaAsDecimalJournal);
			AccountingTransformer.transformToJournal(source, el, pgcData, commaAsDecimalJournal);
		});

	}

	getCommaAsDecimal(): boolean {
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) throw new Error("No active file");

			const metadata = this.app.metadataCache.getFileCache(file);
			const fm = metadata?.frontmatter;
			console.log(fm)
			if (fm && typeof fm["acj-commaAsDecimal"] === "boolean") {
				return fm["acj-commaAsDecimal"];
			}
		} catch (e) {
		}

		return this.settings.commaAsDecimal;
	}


	// Settings 
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// add the setting tap 
		this.addSettingTab(new AccountingJournalSettingsTab(this.app, this));
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
