
export type accountEquivalent = Record<string, string>;


// Journal book
export type JournalEntryLine = [number, string];                       // [ammount, account]
export type JournalEntry = [JournalEntryLine[], JournalEntryLine[]];   // [debit, creedit]
export type JournalEntries = JournalEntry[];                           // Several parts of an entry
export type FullJournalEntryParams = {
    date: string;
    description: string;
    entries: JournalEntries;
    balanced: boolean;

};

// Ledger book

export type LedgerEntryParams = {
    account: string;                            // Account code
    entries: [number[], number[]];              // Entries in the form of [debit, credit]
    sum: number                                 // Sum of the entries, if positive, debit, if negative, credit
};
