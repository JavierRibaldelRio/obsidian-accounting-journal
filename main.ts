import { Plugin, TFile, Notice, Editor, MarkdownView } from 'obsidian';

import { AccountingJournalSettingsTab } from 'src/AccountingJournalSettingTab';
import type { accountEquivalent } from 'types/accountingTypes';
import { AccountingTransformer } from 'utils/AccountingTransformer';
import { parseCSVAccountingEquivalences } from 'utils/parseCSVAccountingEquivalences';

import pgcDataJson from './assets/PGC-2017.json';

// Default account equivalence data
const pgcData: accountEquivalent = pgcDataJson as accountEquivalent;

interface AccountingJournalLedgerSettings {
	commaAsDecimal: boolean;
	journalSeparator: string
	defaultEquivCsvPath: string
}

const DEFAULT_SETTINGS: AccountingJournalLedgerSettings = {
	commaAsDecimal: false,
	journalSeparator: '',
	defaultEquivCsvPath: ''
};

/**
 * Main plugin class for the accounting journal and ledger in Obsidian.
 */
export default class AccountingJournalLedger extends Plugin {

	settings: AccountingJournalLedgerSettings;
	accountEquivalence: accountEquivalent;

	/**
	 * Called when the plugin is loaded.
	 */
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
				const journalSeparator: string = this.getJournalSeparator();
				const accountEquiv: accountEquivalent = await this.getaccountEquivalence();

				AccountingTransformer.transformToJournal(source, el, accountEquiv, commaAsDecimalJournal, journalSeparator);
			});


			// Accountability Journal, Diary Book (Libro diario) with a modern table style
			this.registerMarkdownCodeBlockProcessor('acj-m', async (source, el, ctx) => {

				// Check if is commaAsDecimal is overriden by local config through props
				const commaAsDecimalJournal: boolean = this.getCommaAsDecimal()
				const accountEquiv: accountEquivalent = await this.getaccountEquivalence();

				AccountingTransformer.transformToJournalModern(source, el, accountEquiv, commaAsDecimalJournal);

			});

			// Accountability Ledger, Ledger Book (Libro mayor), in tradicional T accounting style
			this.registerMarkdownCodeBlockProcessor('acl', async (source, el, ctx) => {

				// Check if is commaAsDecimal is overriden by local config through props
				const commaAsDecimalLedger: boolean = this.getCommaAsDecimal()
				const accountEquiv: accountEquivalent = await this.getaccountEquivalence();

				AccountingTransformer.transformToLedger(source, el, accountEquiv, commaAsDecimalLedger);
			});
		});

		this.addCommand({
			id: 'fix-accounting',
			name: 'Fix accounting entries',
			editorCallback: async (editor: Editor, view: MarkdownView) => {

				// Check if there is an active file from editor
				const file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice("No active file to fix accounting entries.");
					return;
				}

				// Get settings
				const commaAsDecimal: boolean = this.getCommaAsDecimal();
				const journalSeparator: string = this.getJournalSeparator();
				const accountEquiv: accountEquivalent = await this.getaccountEquivalence();

				this.app.vault.process(file, (data: string) => {
					return data
						// Replace acj 
						.replace(/```acj\s*\n([\s\S]*?)```/g, (match, content) => {

							const el = document.createElement('div');
							AccountingTransformer.transformToJournal(content, el, accountEquiv, commaAsDecimal, journalSeparator);
							return new XMLSerializer().serializeToString(el);
						})

						// Replace acj-m
						.replace(/```acj-m\s*\n([\s\S]*?)```/g, (match, content) => {

							const el = document.createElement('div');
							AccountingTransformer.transformToJournalModern(content, el, accountEquiv, commaAsDecimal);
							return new XMLSerializer().serializeToString(el);
						})

						// Replace acl
						.replace(/```acl\s*\n([\s\S]*?)```/g, (match, content) => {

							const el = document.createElement('div');
							AccountingTransformer.transformToLedger(content, el, accountEquiv, commaAsDecimal);
							return new XMLSerializer().serializeToString(el);
						});
				});
			}
		});


	}

	/**
	 * Generates the account equivalence from the configured CSV file or uses the default PGC data.
	 */
	async generateAccountEquivalence(): Promise<void> {

		// Get the file path from settings
		try {
			const filePath = this.settings.defaultEquivCsvPath;


			if (!filePath || filePath === "/") {

				console.info("Spanish account system data");

				this.accountEquivalence = pgcData; // Fallback to PGC data

			} else {
				this.accountEquivalence = await this.readCSVFile(filePath);
			}
		}
		catch (e) {
			console.error("Error parsing account equivalence CSV file:", e);
			console.info("Using Spanish account system data instead.");

			this.accountEquivalence = pgcData; // Fallback to PGC data
		}
	}

	/**
	 * Reads a CSV file and parses it into an accountEquivalent object.
	 * @param filePath Path to the CSV file.
	 * @returns Account equivalence object.
	 */
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

	/**
	 * Gets whether to use comma as decimal separator, considering global settings and frontmatter.
	 * @returns true if comma is used as decimal separator, false otherwise.
	 */
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
		}
		catch (e) {
		}

		return this.settings.commaAsDecimal;

	}

	/**
	 * Gets the journal separator, considering global settings and frontmatter.
	 * @returns Journal separator string.
	 */
	getJournalSeparator(): string {
		// Check if the setting is overriden by frontmatter
		try {
			const file = this.app.workspace.getActiveFile();
			if (!file) throw new Error("No active file");

			const metadata = this.app.metadataCache.getFileCache(file);
			const fm = metadata?.frontmatter;

			// override by frontmatter
			if (fm && typeof fm["acj-journalSeparator"] === "string") {
				return fm["acj-journalSeparator"];
			}
		}
		catch (e) {
		}

		return this.settings.journalSeparator;
	}

	/**
	 * Gets the account equivalence, considering frontmatter and global settings.
	 * @returns Account equivalence object.
	 */
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
		}
		catch (e) {
			console.error("Error getting account equivalence from frontmatter:", e);

			new Notice("Error getting account equivalence from frontmatter. Using default settings.");

		}

		return this.accountEquivalence;
	}

	// Settings 

	/**
	 * Loads the plugin settings and adds the settings tab.
	 */
	async loadSettings() {

		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// Ensure the default values are set
		if (!this.settings.defaultEquivCsvPath) {
			this.settings.defaultEquivCsvPath = '';
		}

		this.addSettingTab(new AccountingJournalSettingsTab(this.app, this));
	}

	/**
	 * Saves the plugin settings.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
	}
}
