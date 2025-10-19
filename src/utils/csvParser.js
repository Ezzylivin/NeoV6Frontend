// File: src/utils/csvParser.js (NEW FILE)

/**
 * Parses CSV text into an array of objects (keys are headers).
 * This uses native JS methods for maximum stability.
 * @param {string} csvText - The raw CSV string data.
 * @returns {Array<Object>}
 */
export const parseCsvText = (csvText) => {
    // 1. Split text into lines, filter out empty ones, and trim whitespace
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');

    if (lines.length <= 1) return [];

    // 2. Get the header row and clean column names
    const header = lines[0].split(',').map(h => h.trim());

    // 3. Process the data rows (starting from the second line)
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const rowObject = {};

        // Map values to header keys
        for (let j = 0; j < header.length && j < values.length; j++) {
            const key = header[j];
            const value = values[j] ? values[j].trim() : null;

            // Attempt to convert to number, falling back to string if necessary
            const numValue = parseFloat(value);
            rowObject[key] = isNaN(numValue) ? value : numValue; 
        }
        data.push(rowObject);
    }
    return data; 
};
