import type { accountEquivalent, JournalEntries, JournalEntry, JournalEntryLine } from '../types/accountingTypes'

type FullJournalEntryParams = {
    date: string;
    description: string;
    entries: JournalEntries;
    balanced: boolean;
};

export class FullJournalEntry {
    date: string;
    description: string;
    entries: JournalEntries;
    balanced: boolean;

    constructor({ date, description, entries, balanced }: FullJournalEntryParams) {
        this.date = date;
        this.description = description;
        this.entries = entries;
        this.balanced = balanced;
    }
}

export class AccountingTransformer {


    static transformToJournal(content: string, el: HTMLElement, acEquiv: accountEquivalent, commaAsDecimal: boolean): void {

        try {
            const fullEntry = this.generateJournalEntries(content, acEquiv);
            this.createJournalEntryHTML(fullEntry, el, commaAsDecimal);

        } catch (error) {
            console.error('Error generating accounting journal entries: ', error);
            el.createEl('div', {
                text: 'Error generating journal entries: ' + error.message, attr: { class: 'acjp-error' }
            });
        }
    }


    static generateJournalEntries(content: string, acEquiv: accountEquivalent): FullJournalEntry {
        // Get the first line to extract the date and description
        const firstLineEnd = content.indexOf('\n')
        const [date, description] = content.substring(0, firstLineEnd).split(",");

        // Validate that both fields are present
        if (!date || !description) {
            throw new Error("Invalid journal entry format. The first line should contain the date and description separated by a comma.");
        }
        const contentString = content.substring(firstLineEnd);

        // sum stores the totals for debit and credit to check if the entry is balanced
        let sum: [number, number] = [0, 0];
        // balanced indicates if the entry is balanced
        let balanced: boolean = true;


        function formatAsJournalEntryLine(note: string, i: number): JournalEntryLine {
            let [text, ammountS] = note.split('-').map(x => x.trim());

            // Validate that both text and amount are present
            if (!text || !ammountS) {
                throw new Error(`Invalid journal entry line format: "${note}".Each line should contain an account code and an amount separated by a hyphen(-).`);
            }

            // Try to parse the number in standard format
            let ammount: number = Number(ammountS);

            // If it fails, try with comma as decimal separator
            if (isNaN(ammount)) {
                ammount = Number(ammountS.replace(',', '.'));
            }

            // If still fails, throw error
            if (isNaN(ammount)) {
                throw new Error(`Invalid amount "${ammountS}" in entry: ${note}.` + "\nPlease ensure that the amount is a valid number using a period (.) as the decimal separator, and do not use commas (,) for thousands.");
            }

            // Negative amounts are not allowed
            if (ammount < 0) {
                throw new Error(`Negative amount "${ammountS}" in entry: ${note}.` + "\nPlease ensure that amounts are positive numbers.");
            }

            // Add the amount to debit or credit if still balanced
            if (balanced) {
                sum[i] += ammount
            }

            // Look up the equivalent account name
            let accountName: string = text;
            const name: string = acEquiv[String(text)];

            if (name) {
                accountName = '(' + text + ') ' + name;
            }
            return [ammount, accountName];
        }

        // Process all journal entries
        const journalEntries: JournalEntries = contentString.split(/={3,}/) // Split by each entry
            .map(entry => entry.trim()) // Trim each entry
            .filter(entry => entry !== "") // Remove empty entries
            .map((entry): JournalEntry => {
                // Split each entry into debit and credit
                const temp = entry.split(/-{3,}/);

                if (temp.length !== 2) {
                    throw new Error("Invalid journal entry format. Each entry should have a debit and credit section separated by '---'.");
                }

                const out = temp.map((part, i): JournalEntryLine[] =>
                    part.trim()
                        .split(/\n/)
                        .filter(line => line.trim() !== "")
                        .map((note) => formatAsJournalEntryLine(note, i)) // Convert each line
                ) as JournalEntry;

                // Check if the entry is balanced
                if (balanced) {
                    balanced = sum[0] === sum[1];
                    sum = [0, 0];
                }

                return out;
            });

        // Return the complete entry as an instance of the class
        return new FullJournalEntry({
            date: date.trim(),
            description: description.trim(),
            entries: journalEntries,
            balanced: balanced
        });
    }



    static createJournalEntryHTML(fullJourntal: FullJournalEntry, el: HTMLElement, commaAsDecimal: boolean): void {

        const { date, description, entries, balanced } = fullJourntal;

        console.log('date :>> ', date);

        // Create the table & adding red border when needed
        const table = el.createEl('table', { attr: { class: "acjp-table" + (!balanced ? " acjp-not-balanced" : '') } });

        // Create the header row
        const header = table.createEl('thead');
        const headerRow = header.createEl('tr');
        headerRow.createEl('td', { text: date, attr: { colspan: "5", class: "acjp-center" } });

        entries.forEach((entry) => {
            const debits = entry[0];
            const credits = entry[1];

            console.log('debits :>> ', debits);
            console.log('credits :>> ', credits);

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

        return (num !== undefined && !isNaN(num)) ? Intl.NumberFormat(commaAsDecimal ? 'es-ES' : 'en-US',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
                useGrouping: true // Forces the thousands separator
            }
        ).format(num) : '';

    }
}


