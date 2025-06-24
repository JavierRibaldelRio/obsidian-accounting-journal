
export type accountEquivalent = Record<string, string>;


// Journal book
export type JournalEntryLine = [number, string];                       // [ammount, account]
export type JournalEntry = [JournalEntryLine[], JournalEntryLine[]];   // [debit, creedit]
export type JournalEntries = JournalEntry[];                           // Several parts of an entry

