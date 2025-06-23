import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import pgcDataJson from './assets/PGC-2017.json';

const pgcData: Record<string, string> = pgcDataJson as Record<string, string>;



// Remember to rename these classes and interfaces!

interface AccountingJournalPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: AccountingJournalPluginSettings = {
	mySetting: 'default'
}

export default class AccountingJournalPlugin extends Plugin {
	async onload() {

		// Accountability Journal, Diary Book (Libro diario)
		this.registerMarkdownCodeBlockProcessor('acj', (source, el, ctx) => {

			// Get the the first row to get the date and the description & the content
			const firstLineEnd = source.indexOf('\n')
			const [date, description] = source.substring(0, firstLineEnd).split(",");
			const contentString = source.substring(firstLineEnd);


			const journalEntries = contentString.split(/={3,}/)					// Splits by each entry
				.map((entry) =>
					entry.split(/-{3,}/)										// For each entry splits between debit & credit
						.map(part => part.trim().split("\n")					// For each part splits the different lines
							.map(note => {

								// For each line, gets the ammount and the number of the accunt
								let [ammountS, text] = note.split('-').map(x => x.trim());

								const ammount: number = Number(ammountS);

								let accountName: string = text;

								const accountNumber: number = Number(text);

								// If the account field is a number looks for its name on PGC
								if (!isNaN(accountNumber)) {

									const name: string = pgcData[String(accountNumber)];
									accountName = '(' + accountNumber + ')' + ((name) ? (' ' + name) : "");

								}
								return [ammount, accountName];
							})
						)

				);


			// Create the table
			const table = el.createEl('table', { attr: { class: "acjp-table" } });

			// Create the header row
			const header = table.createEl('thead');
			const headerRow = header.createEl('tr');
			headerRow.createEl('td', { text: date, attr: { colspan: "5", class: "acjp-center" } });

			journalEntries.forEach((entry) => {
				const debits = entry[0];
				const credits = entry[1];
				const max = Math.max(debits.length, credits.length);

				const body = table.createEl('tbody');


				for (let i = 0; i < max; i++) {
					const debitAccount: number | string = debits[i]?.[1] || "";
					const creditAccount: number | string = credits[i]?.[1] || "";

					const debitAmount: number | string = debits[i]?.[0] || "";
					const creditAmount: number | string = credits[i]?.[0] || "";

					const row = body.createEl("tr");
					row.createEl('td', { text: debitAmount.toString(), attr: { class: 'acjp-number' } });
					row.createEl('td', { text: debitAccount.toString(), attr: { class: 'acjp-name' } });
					row.createEl('td', { text: 'a', attr: { class: 'acjp-separator acjp-center' } }); // columna vacía separadora
					row.createEl('td', { text: creditAccount.toString(), attr: { class: 'acjp-name' } });
					row.createEl('td', { text: creditAmount.toString(), attr: { class: 'acjp-number' } });
				}
			});

			console.log('description :>> ', description);
			table.createEl('tbody').createEl('tr').createEl('td', { text: description, attr: { colspan: "5", class: 'acjp-center' } });


		});

	}
}

