const sql = require('mssql');
const fs = require('fs');
require('dotenv').config();

const config = {
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

async function executeUpdates() {
    try {
        console.log('Connecting to database...');
        await sql.connect(config);
        console.log('✓ Connected\n');

        const sqlContent = fs.readFileSync('update-missing-wikipedia-urls.sql', 'utf8');
        const updates = sqlContent
            .split('\n')
            .filter(line => line.trim().startsWith('UPDATE'))
            .map(line => line.trim().replace(/;$/, ''));

        console.log(`Found ${updates.length} UPDATE statements\n`);

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < updates.length; i++) {
            const update = updates[i];
            try {
                await sql.query(update);
                successCount++;
                console.log(`[${i + 1}/${updates.length}] ✓ Success`);
            } catch (err) {
                errorCount++;
                console.log(`[${i + 1}/${updates.length}] ✗ Error: ${err.message}`);
            }
        }

        console.log(`\n═══════════════════════════════════════`);
        console.log(`✓ Successfully updated: ${successCount}`);
        console.log(`✗ Failed: ${errorCount}`);
        console.log(`═══════════════════════════════════════`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sql.close();
    }
}

executeUpdates();
