import type {
    JournalEntries,
    FullJournalEntryParams,
    LedgerEntryParams
} from '../types/accountingTypes'

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

/**
 * Represents a ledger entry with account, entries, and sum for balance checking.
 */
export class LedgerEntry {
    account: string;                    // Account code
    entries: [number[], number[]];      // Entries in the form of [debit, credit]
    sum: number;                        // Sum of the amounts to check if the entry is balanced

    constructor({ account, entries, sum }: LedgerEntryParams) {
        this.account = account
        this.entries = entries;
        this.sum = sum;
    }
}