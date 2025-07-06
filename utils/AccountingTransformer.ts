import type {
    accountEquivalent, JournalEntries, JournalEntry, JournalEntryLine, FullJournalEntryParams,
    LedgerEntryParams
} from '../types/accountingTypes'

import { FullJournalEntry, LedgerEntry } from './AccountingModels';

/**
 * Provides static methods to transform, parse, and render accounting journal and ledger entries.
 */
export class AccountingTransformer {

    /**
     * Transforms raw content into a journal entry and renders it as HTML.
     * @param content Raw journal entry text.
     * @param el HTMLElement to render into.
     * @param acEquiv Account equivalence map.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     * @param separtor Separator string for the table.
     */
    static transformToJournal(content: string, el: HTMLElement, acEquiv: accountEquivalent, commaAsDecimal: boolean, separtor: string): void {

        try {
            const fullEntry = this.generateJournalEntries(content, acEquiv);
            this.createJournalEntryHTML(fullEntry, el, commaAsDecimal, separtor);

        }
        catch (error) {
            console.error('Error generating accounting journal entries: ', error);
            el.createEl('div', {
                text: 'Error generating journal entries: ' + error.message, attr: { class: 'acjp-error' }
            });
        }
    }

    /**
     * Transforms raw content into a modern journal entry and renders it as HTML.
     * @param content Raw journal entry text.
     * @param el HTMLElement to render into.
     * @param acEquiv Account equivalence map.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     */
    static transformToJournalModern(content: string, el: HTMLElement, acEquiv: accountEquivalent, commaAsDecimal: boolean): void {

        try {
            const fullEntry = this.generateJournalEntries(content, acEquiv);
            this.createJournalEntryHTMLModern(fullEntry, el, commaAsDecimal);

        }
        catch (error) {
            console.error('Error generating accounting journal entries: ', error);
            el.createEl('div', {
                text: 'Error generating journal entries: ' + error.message, attr: { class: 'acjp-error' }
            });
        }

    }

    /**
     * Parses raw content into a FullJournalEntry object.
     * @param content Raw journal entry text.
     * @param acEquiv Account equivalence map.
     * @returns FullJournalEntry object.
     * @throws Error if the format is invalid.
     */
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
            const account: string = String(text).trim();
            const accountName: string = acEquiv[account] || '';

            return [ammount, account, accountName];
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

    /**
     * Renders a FullJournalEntry as a classic HTML table.
     * @param fullJournal FullJournalEntry object.
     * @param el HTMLElement to render into.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     * @param separator Separator string for the table.
     */
    static createJournalEntryHTML(fullJournal: FullJournalEntry, el: HTMLElement, commaAsDecimal: boolean, separator: string): void {

        const { date, description, entries, balanced } = fullJournal;

        // Create the table & adding red border when needed
        const table = el.createEl('table', { cls: "acjp-table" + (!balanced ? " acjp-not-balanced" : '') });

        // Create the header row
        const header = table.createEl('thead');
        const headerRow = header.createEl('tr');
        headerRow.createEl('td', { text: date, cls: "acjp-center", attr: { colspan: 5 } });

        entries.forEach((entry) => {
            const debits = entry[0];
            const credits = entry[1];

            const max = Math.max(debits.length, credits.length);

            const body = table.createEl('tbody');

            for (let i = 0; i < max; i++) {
                const debitAccount: string = this.formatJournalAccountName(debits[i]);
                const creditAccount: string = this.formatJournalAccountName(credits[i]);

                const debitAmount: string = this.formatLocaleNumber(debits[i]?.[0], commaAsDecimal);
                const creditAmount: string = this.formatLocaleNumber(credits[i]?.[0], commaAsDecimal);

                const row = body.createEl("tr");
                row.createEl('td', { text: debitAmount, cls: 'acjp-number' });
                row.createEl('td', { text: debitAccount, cls: 'acjp-name' });
                row.createEl('td', { text: separator, cls: 'acjp-separator acjp-center' });
                row.createEl('td', { text: creditAccount, cls: 'acjp-name' });
                row.createEl('td', { text: creditAmount, cls: 'acjp-number' });
            }
        });

        // Entry description
        table.createEl('tbody').createEl('tr').createEl('td', { text: description, attr: { colspan: 5 }, cls: 'acjp-center' });
    }

    /**
     * Formats a journal entry line to display the account name and code.
     * @param journalLine JournalEntryLine array.
     * @returns Formatted account name string.
     */
    static formatJournalAccountName(journalLine: JournalEntryLine): string {

        if (journalLine) {

            const [ammount, account, name] = journalLine;

            // Look up the equivalent account name
            let accountName: string = account;
            if (name) {
                accountName = '(' + account + ') ' + name; // If the name exists, add it to the account
            }

            return accountName || '';
        }

        else {
            return '';
        }
    }

    /**
     * Renders a FullJournalEntry as a modern HTML table.
     * @param fullJournal FullJournalEntry object.
     * @param el HTMLElement to render into.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     */
    static createJournalEntryHTMLModern(fullJournal: FullJournalEntry, el: HTMLElement, commaAsDecimal: boolean): void {

        const { date, description, entries, balanced } = fullJournal;

        // Create the table & adding red border when needed
        const table = el.createEl('table', { cls: "acjp-modern-table" + (!balanced ? " acjp-not-balanced" : '') });

        // Create the header row
        const header = table.createEl('thead');
        const headerRow = header.createEl('tr');
        headerRow.createEl('td', { text: "Particulars", cls: 'acjp-center' });
        headerRow.createEl('td', { text: "Ref", cls: 'acjp-center' });
        headerRow.createEl('td', { text: "Debit", cls: 'acjp-center' });
        headerRow.createEl('td', { text: "Credit", cls: 'acjp-center' });

        entries.forEach((entry) => {

            const tbody = table.createEl('tbody');
            tbody.createEl('tr').createEl('td', { text: date, attr: { colspan: 4 } });

            const debits = entry[0];
            const credits = entry[1];

            debits.forEach((debit) => {
                const [ammount, account, name] = debit;

                const debitAmount: string = this.formatLocaleNumber(ammount, commaAsDecimal);

                const row = tbody.createEl("tr");
                if (name) {
                    row.createEl('td', { text: name, cls: 'acjp-name' });
                    row.createEl('td', { text: account, cls: 'acjp-name acjp-center' });
                }
                else {
                    row.createEl('td', { text: account, cls: 'acjp-name' });
                    row.createEl('td', { text: '', cls: 'acjp-name acjp-center' });
                }
                row.createEl('td', { text: debitAmount, cls: 'acjp-number' });
                row.createEl('td', { text: '', cls: 'acjp-number' });
            });


            credits.forEach((credit) => {
                const [ammount, account, name] = credit;

                const creditAmount: string = this.formatLocaleNumber(ammount, commaAsDecimal);

                const row = tbody.createEl("tr");
                if (name) {
                    row.createEl('td', { text: name, cls: 'acjp-name acjp-ledger-account-name' });
                    row.createEl('td', { text: account, cls: 'acjp-name acjp-center' });
                }
                else {
                    row.createEl('td', { text: account, cls: 'acjp-name acjp-ledger-account-name' });
                    row.createEl('td', { text: '', cls: 'acjp-name acjp-center' });
                }
                row.createEl('td', { text: '', cls: 'acjp-number' });
                row.createEl('td', { text: creditAmount, cls: 'acjp-number' });
            });


            const row = tbody.createEl('tr');
            row.createEl('td', { text: description, attr: { colspan: 2 }, cls: 'acjp-center ' });
            row.createEl('td', { text: '', attr: { colspan: 2 } });
        });
    }

    /**
     * Transforms raw content into a ledger entry and renders it as HTML.
     * @param content Raw ledger entry text.
     * @param el HTMLElement to render into.
     * @param acEquiv Account equivalence map.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     */
    static transformToLedger(content: string, el: HTMLElement, acEquiv: accountEquivalent, commaAsDecimal: boolean): void {

        try {
            const ledger = this.generateLedger(content, acEquiv);
            this.createLedgerEntryHTML(ledger, el, commaAsDecimal);

        }
        catch (error) {
            console.error('Error generating accounting ledger entries: ', error);
            el.createEl('div', {
                text: 'Error generating ledger entries: ' + error.message, attr: { class: 'acjp-error' }
            });
        }
    }

    /**
     * Parses raw content into a LedgerEntry object.
     * @param content Raw ledger entry text.
     * @param acEquiv Account equivalence map.
     * @returns LedgerEntry object.
     * @throws Error if the format is invalid.
     */
    static generateLedger(content: string, acEquiv: accountEquivalent): LedgerEntry {

        const firstLineEnd = content.indexOf('\n');
        let account = content.substring(0, firstLineEnd).trim();

        // Validate that the account is not empty
        if (!account) {
            throw new Error("Invalid ledger entry format. The first line should contain the account code.");
        }

        // Trys to get the account name from the equivalences
        let accountName: string | undefined = acEquiv[account];

        if (accountName) {
            account = '(' + account + ') ' + accountName; // If the name exists, add it to the account
        }


        const parts = content.substring(firstLineEnd)
            .split(/-{3,}/)                 // Split by each entry
            .map(entry => entry.trim())     // Trim each entry
            .filter(entry => entry !== "")  // Remove empty entries  

        if (parts.length !== 2) {
            throw new Error("Invalid ledger entry format. Each entry should have a debit and credit section separated by '---'.");
        }

        let sum: number = 0; // Sum of the amounts to check if the entry is balanced

        const [debitString, creditString] = parts;

        // Function to format each line as a number and add it to the sum
        // Throws an error if the amount is not a valid number
        function formatAsLedgerLine(note: string): number {
            let amount: number = Number(note);

            if (isNaN(amount)) {
                amount = Number(note.replace(',', '.'));
            }
            if (isNaN(amount)) {
                throw new Error(`Invalid amount "${note}" in entry: ${note}.` + "\nPlease ensure that the amount is a valid number using a period (.) as the decimal separator, and do not use commas (,) for thousands.");
            }

            sum += amount;
            return amount
        }

        // Process debit 
        const debit = debitString.split('\n')
            .filter(line => line.trim() !== "")
            .map(formatAsLedgerLine);

        sum = -sum; // The debit and credit are equal, so we invert the sum to later check if the entry is balanced (sum === 0)

        // Process credit
        const credit: number[] = creditString.split('\n')
            .filter(line => line.trim() !== "")
            .map(formatAsLedgerLine);


        return new LedgerEntry({
            account: account,
            entries: [debit, credit],
            sum: sum
        })
    }

    /**
     * Renders a LedgerEntry as an HTML table.
     * @param ledger LedgerEntry object.
     * @param el HTMLElement to render into.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     */
    static createLedgerEntryHTML(ledger: LedgerEntry, el: HTMLElement, commaAsDecimal: boolean): void {
        const { account, entries, sum } = ledger;

        // Create the table
        const table = el.createEl('table', { cls: "acjp-ledger-table" });

        // Create the header row
        const header = table.createEl('thead');
        const headerRow = header.createEl('tr');
        headerRow.createEl('td', { text: account, attr: { colspan: 2 }, cls: "acjp-center" });

        // Create the body
        const body = table.createEl('tbody');
        const debit = entries[0];
        const credit = entries[1];

        const max = Math.max(debit.length, credit.length);

        for (let i = 0; i < max; i++) {
            const debitAmount: string = this.formatLocaleNumber(debit[i] || 0, commaAsDecimal);
            const creditAmount: string = this.formatLocaleNumber(credit[i] || 0, commaAsDecimal);

            const row = body.createEl("tr");
            row.createEl('td', { text: debitAmount, cls: 'acjp-number' });
            row.createEl('td', { text: creditAmount, cls: 'acjp-number' });
        }

        // Adds extra row empty

        const extraRow = body.createEl("tr");
        extraRow.createEl('td', { text: '', cls: 'acjp-number' });
        extraRow.createEl('td', { text: '', cls: 'acjp-number' });
    }

    /**
     * Formats a number according to the selected locale.
     * If commaAsDecimal is true, uses 'es-ES' (comma as decimal separator), otherwise 'en-US'.
     * Returns an empty string if the input is undefined.
     * @param num Number to format.
     * @param commaAsDecimal Whether to use comma as decimal separator.
     * @returns Formatted number as string.
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


