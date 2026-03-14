const https = require('https');
const sql = require('mssql');
const fs = require('fs');
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
        trustServerCertificate: true,
        encrypt: true,
        instanceName: instanceName,
        enableArithAbort: true
    }
};

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
                    reject(err);
                }
            });
        }).on('error', reject);
    });
}

// Search Hebrew Wikipedia for a rabbi by name
async function searchWikipedia(rabbiName) {
    try {
        // Remove common prefixes
        let searchName = rabbiName
            .replace(/^רבי\s+/i, '')
            .replace(/^רב\s+/i, '')
            .replace(/^ר[״"']\s*/i, '')
            .trim();

        console.log(`  Searching: "${searchName}"`);

        const searchUrl = `https://he.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchName)}&limit=5&namespace=0&format=json`;
        const searchResults = await httpsGet(searchUrl);

        if (searchResults && searchResults[1] && searchResults[1].length > 0) {
            const title = searchResults[1][0];
            const url = searchResults[3][0];
            console.log(`  ✓ Found: ${title}`);
            
            // Convert URL to use Hebrew characters instead of encoding
            const urlMatch = url.match(/\/wiki\/(.+)/);
            if (urlMatch) {
                const pageTitle = decodeURIComponent(urlMatch[1]);
                return { title, url: `https://he.wikipedia.org/wiki/${pageTitle}`, found: true };
            }
            return { title, url, found: true };
        } else {
            console.log(`  ✗ Not found`);
            return { found: false };
        }
    } catch (error) {
        console.error(`  Error: ${error.message}`);
        return { found: false };
    }
}

async function generateScript() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        
        console.log('Loading rabbis without URLs...\n');
        const result = await pool.request().query(
            "SELECT RabbiID, FullName, knownAs FROM Talmidei_Hahamim WHERE url IS NULL OR url = '' ORDER BY RabbiID"
        );
        
        const rabbis = result.recordset;
        console.log(`Found ${rabbis.length} rabbis without URLs\n`);
        
        let sqlStatements = [];
        sqlStatements.push('-- Wikipedia URL Updates for remaining Talmidei_Hahamim');
        sqlStatements.push('-- Generated automatically from database query');
        sqlStatements.push('-- Total rabbis without URLs: ' + rabbis.length);
        sqlStatements.push('');
        
        let found = 0;
        let notFound = 0;
        const notFoundList = [];
        
        for (let i = 0; i < rabbis.length; i++) {
            const rabbi = rabbis[i];
            const rabbiName = rabbi.FullName || rabbi.knownAs;
            
            console.log(`[${i + 1}/${rabbis.length}] ${rabbiName} (ID: ${rabbi.RabbiID})`);
            
            // Try full name first
            let result = await searchWikipedia(rabbiName);
            
            // If not found and we have a different knownAs, try that
            if (!result.found && rabbi.knownAs && rabbi.knownAs !== rabbiName) {
                console.log(`  Trying alternative: "${rabbi.knownAs}"`);
                result = await searchWikipedia(rabbi.knownAs);
            }
            
            if (result.found) {
                found++;
                // Escape single quotes for SQL by doubling them
                const escapedUrl = result.url.replace(/'/g, "''");
                sqlStatements.push(`UPDATE Talmidei_Hahamim SET url = '${escapedUrl}' WHERE RabbiID = ${rabbi.RabbiID};`);
            } else {
                notFound++;
                notFoundList.push({ id: rabbi.RabbiID, name: rabbiName });
            }
            
            // Small delay to avoid overwhelming Wikipedia
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        sqlStatements.push('');
        sqlStatements.push(`-- Found: ${found} URLs`);
        sqlStatements.push(`-- Not found: ${notFound} rabbis`);
        
        if (notFoundList.length > 0) {
            sqlStatements.push('');
            sqlStatements.push('-- Not found (manual search needed):');
            notFoundList.forEach(item => {
                sqlStatements.push(`-- RabbiID ${item.id} - ${item.name}`);
            });
        }
        
        const outputFile = 'update-missing-wikipedia-urls.sql';
        fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf8');
        
        console.log('\n===================================');
        console.log('Summary:');
        console.log(`  Total processed: ${rabbis.length}`);
        console.log(`  Found: ${found}`);
        console.log(`  Not found: ${notFound}`);
        console.log(`  Output file: ${outputFile}`);
        console.log('===================================\n');
        
        await sql.close();
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

generateScript();
