const fs = require('fs');
const https = require('https');
const path = require('path');
const sql = require('mssql');
require('dotenv').config({ path: __dirname + '/.env' });

// Derive host and instance from DB_SERVER
const rawServer = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
let serverHost = rawServer;
let instanceName = undefined;
if (rawServer.includes('\\')) {
    const [host, instance] = rawServer.split('\\');
    serverHost = host;
    instanceName = instance;
}

// Database configuration
const dbConfig = {
    server: serverHost,
    database: process.env.DB_DATABASE || 'Hazal',
    user: process.env.DB_USERNAME || 'hazal_user2',
    password: process.env.DB_PASSWORD || 'hazal_user2',
    connectionTimeout: 30000,
    requestTimeout: 30000,
    options: {
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        encrypt: process.env.DB_ENCRYPT === 'true',
        instanceName: instanceName,
        enableArithAbort: true
    }
};

// Command line arguments
const args = process.argv.slice(2);
const options = {
    updateDatabase: args.includes('--update-db'),
    downloadContent: args.includes('--download'),
    dryRun: args.includes('--dry-run'),
    limitRows: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null,
    onlyMissing: args.includes('--only-missing'),
    verbose: args.includes('--verbose'),
    fromDatabase: args.includes('--from-db')
};

console.log('Wikipedia URL Finder - Options:', options);
console.log('-----------------------------------\n');

// Helper function to make HTTP requests
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': 'RaboteinuZl/1.0 (https://github.com/GreenblattArie/Hazal; contact@example.com)'
            }
        };
        
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    console.error('  Response was:', data.substring(0, 200));
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

// Search Hebrew Wikipedia for a rabbi by name
async function searchWikipedia(rabbiName) {
    try {
        // Remove common prefixes for better search results
        let searchName = rabbiName
            .replace(/^רבי\s+/i, '')
            .replace(/^רב\s+/i, '')
            .replace(/^ר[״"']\s*/i, '')
            .trim();

        if (options.verbose) {
            console.log(`  Searching for: "${searchName}"`);
        }

        // Search Wikipedia API
        const searchUrl = `https://he.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchName)}&limit=5&namespace=0&format=json`;
        const searchResults = await httpsGet(searchUrl);

        if (searchResults && searchResults[1] && searchResults[1].length > 0) {
            // Return the first result (title and URL)
            const title = searchResults[1][0];
            const url = searchResults[3][0];
            
            if (options.verbose) {
                console.log(`  Found: ${title} -> ${url}`);
            }
            
            return { title, url, found: true };
        } else {
            if (options.verbose) {
                console.log(`  No results found`);
            }
            return { found: false };
        }
    } catch (error) {
        console.error(`  Error searching Wikipedia: ${error.message}`);
        return { found: false, error: error.message };
    }
}

// Download Wikipedia content
async function downloadWikipediaContent(title) {
    try {
        const apiUrl = `https://he.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&formatversion=2&format=json`;
        const result = await httpsGet(apiUrl);

        if (result && result.parse && result.parse.text) {
            return result.parse.text;
        }
        return null;
    } catch (error) {
        console.error(`  Error downloading content: ${error.message}`);
        return null;
    }
}

// Save content to odot directory
function saveToOdotDirectory(rabbiName, content) {
    const fileName = rabbiName.replace(/\s+/g, '_') + '.txt';
    const filePath = path.join(__dirname, 'odot', fileName);

    // Ensure odot directory exists
    const odotDir = path.join(__dirname, 'odot');
    if (!fs.existsSync(odotDir)) {
        fs.mkdirSync(odotDir, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  Saved content to: ${fileName}`);
}

// Read CSV file
function readCSV(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    const rabbis = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const rabbi = {};
            headers.forEach((header, index) => {
                rabbi[header.trim()] = values[index] ? values[index].trim() : '';
            });
            rabbis.push(rabbi);
        }
    }
    return rabbis;
}

// Parse CSV line (handles quoted fields with commas)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Update database with Wikipedia URL
async function updateDatabaseURL(rabbiID, wikipediaURL) {
    try {
        const pool = await sql.connect(dbConfig);
        const query = `UPDATE Talmidei_Hahamim SET url = @url WHERE RabbiID = @id`;
        await pool.request()
            .input('url', sql.NVarChar, wikipediaURL)
            .input('id', sql.Int, parseInt(rabbiID))
            .query(query);
        console.log(`  Updated database for RabbiID ${rabbiID}`);
    } catch (error) {
        console.error(`  Database error: ${error.message}`);
    }
}

// Function to load rabbis from database
async function loadFromDatabase() {
    try {
        const pool = await sql.connect(dbConfig);
        const query = options.onlyMissing 
            ? "SELECT RabbiID, FullName, knownAs FROM Talmidei_Hahamim WHERE url IS NULL OR url = '' ORDER BY RabbiID"
            : "SELECT RabbiID, FullName, knownAs, url FROM Talmidei_Hahamim ORDER BY RabbiID";
        
        const result = await pool.request().query(query);
        return result.recordset;
    } catch (error) {
        console.error('Database connection error:', error.message);
        throw error;
    }
}

// Main processing function
async function processRabbis() {
    let rabbis;
    
    if (options.fromDatabase) {
        console.log('Loading rabbis from database...');
        rabbis = await loadFromDatabase();
        console.log(`Loaded ${rabbis.length} rabbis from database\n`);
    } else {
        const csvPath = path.join(__dirname, 'rabbis-data.csv');
        
        if (!fs.existsSync(csvPath)) {
            console.error('Error: rabbis-data.csv not found!');
            return;
        }

        rabbis = readCSV(csvPath);
        console.log(`Loaded ${rabbis.length} rabbis from CSV\n`);
    }

    let processed = 0;
    let found = 0;
    let notFound = 0;
    let skipped = 0;

    for (const rabbi of rabbis) {
        // Apply limit if specified
        if (options.limitRows && processed >= options.limitRows) {
            console.log(`\nReached limit of ${options.limitRows} rabbis`);
            break;
        }

        // Skip if only processing missing URLs and this one has a URL
        if (options.onlyMissing && rabbi.url && rabbi.url.trim()) {
            skipped++;
            continue;
        }

        processed++;
        const rabbiName = rabbi.FullName || rabbi.knownAs;
        console.log(`\n[${processed}] Processing: ${rabbiName} (ID: ${rabbi.RabbiID})`);

        if (rabbi.url && rabbi.url.trim() && !options.onlyMissing) {
            console.log(`  Already has URL: ${rabbi.url}`);
            skipped++;
            continue;
        }

        // Search Wikipedia - try full name first, then knownAs if available
        let result = await searchWikipedia(rabbiName);
        
        // If not found and we have a different knownAs, try that
        if (!result.found && rabbi.knownAs && rabbi.knownAs !== rabbiName) {
            if (options.verbose) {
                console.log(`  Trying alternative name: "${rabbi.knownAs}"`);
            }
            result = await searchWikipedia(rabbi.knownAs);
        }

        if (result.found) {
            found++;
            console.log(`  ✓ Found: ${result.url}`);

            if (options.dryRun) {
                console.log(`  (Dry run - no changes made)`);
            } else {
                // Update database if requested
                if (options.updateDatabase) {
                    await updateDatabaseURL(rabbi.RabbiID, result.url);
                }

                // Download content if requested
                if (options.downloadContent) {
                    console.log(`  Downloading content...`);
                    const content = await downloadWikipediaContent(result.title);
                    if (content) {
                        saveToOdotDirectory(rabbiName, content);
                    }
                }
            }
        } else {
            notFound++;
            console.log(`  ✗ Not found on Wikipedia`);
        }

        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n===================================');
    console.log('Summary:');
    console.log(`  Total processed: ${processed}`);
    console.log(`  Found: ${found}`);
    console.log(`  Not found: ${notFound}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('===================================\n');

    if (options.dryRun) {
        console.log('This was a dry run. Use without --dry-run to make actual changes.\n');
    }

    if (options.updateDatabase) {
        await sql.close();
    }
}

// Show usage if --help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Wikipedia URL Finder - Usage:
=============================

node find-wikipedia-urls.js [options]

Options:
  --from-db         Load rabbis from database instead of CSV file
  --update-db       Update the database with discovered Wikipedia URLs
  --download        Download Wikipedia content to backend/odot directory
  --dry-run         Show what would be done without making changes
  --only-missing    Only process rabbis without existing Wikipedia URLs
  --limit N         Process only N rabbis (for testing)
  --verbose         Show detailed search information
  --help, -h        Show this help message

Examples:
  node find-wikipedia-urls.js --from-db --only-missing --verbose
    (Load from database and show missing URLs)

  node find-wikipedia-urls.js --from-db --only-missing --update-db
    (Find and update URLs for all rabbis without URLs in database)

  node find-wikipedia-urls.js --dry-run --limit 5
    (Test run on first 5 rabbis from CSV)

  node find-wikipedia-urls.js --only-missing --update-db
    (Find and update URLs for rabbis without existing URLs)

  node find-wikipedia-urls.js --update-db --download
    (Update database and download all content)
`);
    process.exit(0);
}

// Run the script
processRabbis().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
