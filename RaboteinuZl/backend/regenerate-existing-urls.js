const sql = require('mssql');
const https = require('https');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
    server: 'localhost',
    database: 'Hazal',
    user: 'hazal_user2',
    password: 'hazal_user2',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        instanceName: 'SQLEXPRESS'
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
};

async function generateScript() {
    try {
        console.log('Connecting to database...');
        const pool = await sql.connect(dbConfig);
        
        console.log('Loading rabbis with existing URLs...\n');
        const result = await pool.request().query(
            "SELECT RabbiID, FullName, knownAs, url FROM Talmidei_Hahamim WHERE url IS NOT NULL AND url != '' ORDER BY RabbiID"
        );
        
        const rabbis = result.recordset;
        console.log(`Found ${rabbis.length} rabbis with URLs\n`);
        
        let sqlStatements = [];
        sqlStatements.push('-- Wikipedia URL Updates for existing Talmidei_Hahamim');
        sqlStatements.push('-- Regenerating URLs with Hebrew characters instead of encoded format');
        sqlStatements.push('-- Total rabbis with URLs: ' + rabbis.length);
        sqlStatements.push('');
        
        for (let i = 0; i < rabbis.length; i++) {
            const rabbi = rabbis[i];
            const rabbiName = rabbi.FullName || rabbi.knownAs;
            
            console.log(`[${i + 1}/${rabbis.length}] ${rabbiName} (ID: ${rabbi.RabbiID})`);
            console.log(`  Current URL: ${rabbi.url}`);
            
            // Escape single quotes for SQL by doubling them
            const escapedUrl = rabbi.url.replace(/'/g, "''");
            sqlStatements.push(`UPDATE Talmidei_Hahamim SET url = '${escapedUrl}' WHERE RabbiID = ${rabbi.RabbiID};`);
        }
        
        sqlStatements.push('');
        sqlStatements.push(`-- Total: ${rabbis.length} URLs regenerated with Hebrew characters`);
        
        const outputFile = 'update-existing-urls.sql';
        fs.writeFileSync(outputFile, sqlStatements.join('\n'), 'utf8');
        
        console.log(`\n===================================`);
        console.log(`  Total processed: ${rabbis.length}`);
        console.log(`  Output file: ${outputFile}`);
        console.log(`===================================`);
        
        await pool.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

generateScript();
