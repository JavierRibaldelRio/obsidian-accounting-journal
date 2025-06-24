import { Plugin, TFile } from 'obsidian';
import { AccountingJournalSettingsTab } from 'src/AccountingJournalSettingTab';
import type { accountEquivalent } from 'types/accountingTypes';
import { AccountingTransformer } from 'utils/AccountingTransformer';
import { parseCSVAccountingEquivalences } from 'utils/parseCSVAccountingEquivalences';
import pgcDataJson from './assets/PGC-2017.json';

// Default account equivalence data
const pgcData: accountEquivalent = pgcDataJson as accountEquivalent;

interface AccountingJournalPluginSettings {
	commaAsDecimal: boolean;
	defaultEquivCsvPath: string
}

const DEFAULT_SETTINGS: AccountingJournalPluginSettings = {
	commaAsDecimal: false,
	defaultEquivCsvPath: ''
};

export default class AccountingJournalPlugin extends Plugin {

	settings: AccountingJournalPluginSettings;
	accountEquivalence: accountEquivalent;

	async onload() {

		// Configure settings
		await this.loadSettings();


		// Select accounting codes

		this.app.workspace.onLayoutReady(async () => {
			await this.generateAccountEquivalence();

			// Accountability Journal, Diary Book (Libro diario)
			this.registerMarkdownCodeBlockProcessor('acj', async (source, el, ctx) => {

				// Check if is commaAsDecimal is overriden by local config through props
				const commaAsDecimalJournal: boolean = this.getCommaAsDecimal()

				const accountEquiv: accountEquivalent = await this.getaccountEquivalence();

				console.log('accountEquiv :>> ', accountEquiv);
				AccountingTransformer.transformToJournal(source, el, accountEquiv, commaAsDecimalJournal);
			});

		});

	}

	async generateAccountEquivalence(): Promise<void> {

		// Get the file path from settings
		try {
			const filePath = this.settings.defaultEquivCsvPath;
			this.accountEquivalence = await this.readCSVFile(filePath);
		}
		catch (e) {
			console.error("Error parsing account equivalence CSV file:", e);
			console.info("Using Spanish account system data instead.");

			this.accountEquivalence = pgcData; // Fallback to PGC data
		}
	}


	// Reads the CSV file and parses it into an accountEquivalent object
	async readCSVFile(filePath: string): Promise<accountEquivalent> {

		if (!filePath) {
			throw new Error("Not found account equivalence file path in settings.");
		}

		const file = this.app.vault.getFileByPath(filePath);
		if (!(file && file instanceof TFile)) {
			throw new Error(`File not found at path: ${filePath}`);
		}

		const content: string = await this.app.vault.cachedRead(file)

		// Parse the CSV content
		return parseCSVAccountingEquivalences(content);

	}

	// Getters
	async getaccountEquivalence(): Promise<accountEquivalent> {

		// Check if the setting is overriden by frontmatter
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) throw new Error("No active file");

			const metadata = this.app.metadataCache.getFileCache(file);
			const fm = metadata?.frontmatter;

			// override by frontmatter
			if (fm && typeof fm["acj-accountEquivalence"] === "string") {
				const filePath = fm["acj-accountEquivalence"];
				if (filePath) {
					return await this.readCSVFile(filePath);
				}
				else {
					throw new Error("No account equivalence file path found in frontmatter.");
				}
			}
		} catch (e) {
			console.error("Error getting account equivalence from frontmatter:", e);


		}

		return this.accountEquivalence;
	}
	getCommaAsDecimal(): boolean {

		// Check if the setting is overriden by frontmatter
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) throw new Error("No active file");

			const metadata = this.app.metadataCache.getFileCache(file);
			const fm = metadata?.frontmatter;

			// override by frontmatter
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
