import type { accountEquivalent, JournalEntries, JournalEntry, JournalEntryLine } from '../types/accountingTypes'

export class AccountingTransformer {

    static transformToJournal(content: string, el: HTMLElement, acEquiv: accountEquivalent, commaAsDecimal: boolean): void {

        // Get the the first row to get the date and the description & the content
        const firstLineEnd = content.indexOf('\n')
        const [date, description] = content.substring(0, firstLineEnd).split(",");
        const contentString = content.substring(firstLineEnd);

        // Stores if the entry is balanced + debit - credit
        let sum: [number, number] = [0, 0];
        // Stores if the entry is balanced
        let balanced: boolean = true;



        const journalEntries: JournalEntries = contentString.split(/={3,}/)		// Splits by each entry
            .map((entry): JournalEntry => {


                const res = entry.split(/-{3,}/)					// For each entry splits between debit & credit
                    .map((part, i): JournalEntryLine[] => part.trim()
                        .split(/\n/)                                                // For each part splits the different lines
                        .filter(line => line.trim() !== "")
                        .map((note): JournalEntryLine => {

                            // For each line, gets the ammount and the number of the accunt
                            let [text, ammountS] = note.split('-').map(x => x.trim());

                            // If it is a number in en-US get it
                            let ammount: number = Number(ammountS);

                            // if not, tries again assuming that comma is decimal separator
                            if (isNaN(ammount)) {
                                ammount = Number(ammountS.replace(',', '.'));
                            }

                            // Sums if the previous entries where balanced
                            if (balanced) {
                                sum[i] += ammount
                            }

                            let accountName: string = text;
                            const name: string = acEquiv[String(text)];

                            if (name) {
                                accountName = '(' + text + ') ' + name;
                            }

                            return [ammount, accountName];
                        })
                    ) as JournalEntry;


                // For each entry checks if it is balanced
                if (balanced) {
                    balanced = sum[0] === sum[1];
                    sum = [0, 0];
                }


                return res;

            });


        console.log('balanced :>> ', balanced);

        // Create the table & adding red border when needed
        const table = el.createEl('table', { attr: { class: "acjp-table" + (!balanced ? " acjp-not-balanced" : '') } });

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
                const debitAccount: string = debits[i]?.[1] || "";
                const creditAccount: string = credits[i]?.[1] || "";

                const debitAmount: string = this.formatLocaleNumber(debits[i]?.[0], commaAsDecimal);
                const creditAmount: string = this.formatLocaleNumber(credits[i]?.[0], commaAsDecimal);

                const row = body.createEl("tr");
                row.createEl('td', { text: debitAmount, attr: { class: 'acjp-number' } });
                row.createEl('td', { text: debitAccount, attr: { class: 'acjp-name' } });
                row.createEl('td', { text: 'a', attr: { class: 'acjp-separator acjp-center' } }); // separator
                row.createEl('td', { text: creditAccount, attr: { class: 'acjp-name' } });
                row.createEl('td', { text: creditAmount, attr: { class: 'acjp-number' } });
            }
        });

        // Entry description
        table.createEl('tbody').createEl('tr').createEl('td', { text: description, attr: { colspan: "5", class: 'acjp-center' } });


    }

    /**
     * Formats a number according to the selected locale.
     * If commaAsDecimal is true, uses 'es-ES' (comma as decimal separator), otherwise 'en-US'.
     * Returns an empty string if the input is undefined.
     */
    static formatLocaleNumber(num: number, commaAsDecimal: boolean): string {

        return (num !== undefined && !isNaN(num)) ? Intl.NumberFormat(commaAsDecimal ? 'es-ES' : 'en-US').format(num) : '';

    }
}