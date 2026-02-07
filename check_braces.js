const fs = require('fs');

const content = fs.readFileSync('src/components/CommissionsManagement.tsx', 'utf8');
const lines = content.split('\n');

let level = 0;
let comments = false;
let functionStarted = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Simple comment skipping (not handling block comments perfectly if inline)
    // Assuming well formatted code

    for (let j = 0; j < line.length; j++) {
        const char = line[j];

        if (i >= 69) functionStarted = true; // Line 70 (index 69)

        if (char === '{') {
            level++;
            // console.log(`Line ${i+1}: Open brace. Level: ${level}`);
        }
        if (char === '}') {
            level--;
            // console.log(`Line ${i+1}: Close brace. Level: ${level}`);

            if (functionStarted && level === 0) {
                console.log(`Function closed at line ${i + 1}`);
                process.exit(0);
            }
        }
    }
}

console.log('Function never closed');
