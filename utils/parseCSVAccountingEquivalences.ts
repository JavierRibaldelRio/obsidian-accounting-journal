import { accountEquivalent } from "../types/accountingTypes"

/**
 * Transforms a 2-column CSV string into a key-value map.
 * Ignores empty lines and trims spaces.
 * Throws an error if a row doesn't contain exactly 2 columns.
 * @param csv The CSV string to parse.
 * @returns An accountEquivalent object mapping keys to values.
 * @throws Error if a line does not have exactly two columns or if any column is empty.
 */
export function parseCSVAccountingEquivalences(csv: string): accountEquivalent {
    const map: accountEquivalent = {};

    const lines = csv
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0); // optional: allow comments

    for (const line of lines) {
        const parts = line.split(',').map(p => p.trim());

        // Ensure that each line has exactly two parts, if not, throw an error
        if (parts.length !== 2) {
            throw new Error(`Invalid CSV line: "${line}". Each line must have exactly two columns.`);
        }

        const [key, value] = parts;

        // If either key or value is empty, throw error
        if (key === '' || value === '') {
            throw new Error(`Invalid CSV line: "${line}". Neither column can be empty.`);
        }

        map[key] = value;
    }

    return map;
}