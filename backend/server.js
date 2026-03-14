require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./database');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static images from /img directory
const path = require('path');
app.use('/img', express.static(path.join(__dirname, '../img')));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'RaboteinuZl API is running',
        timestamp: new Date().toISOString() 
    });
});

// Database connection test endpoint
app.get('/api/test-connection', async (req, res) => {
    try {
        await database.connect();
        const result = await database.query('SELECT 1 as test');
        res.json({ 
            success: true, 
            message: 'Database connection successful',
            database: process.env.DB_DATABASE,
            server: process.env.DB_SERVER
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Database connection failed',
            error: error.message 
        });
    }
});

// List databases
app.get('/api/databases', async (req, res) => {
    try {
        await database.connect();
        const result = await database.query('SELECT name FROM sys.databases WHERE name NOT IN (\'master\', \'tempdb\', \'model\', \'msdb\') ORDER BY name');
        res.json({ 
            success: true, 
            databases: result.recordset.map(row => row.name)
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to list databases',
            error: error.message 
        });
    }
});

// Get all tables in the database
app.get('/api/tables', async (req, res) => {
    try {
        const query = `
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_SCHEMA, TABLE_NAME
        `;
        
        const result = await database.query(query);
        res.json({
            success: true,
            tables: result.recordset
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch tables',
            error: error.message 
        });
    }
});

// Get table structure
app.get('/api/tables/:tableName/structure', async (req, res) => {
    try {
        const { tableName } = req.params;
        const query = `
            SELECT 
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = @tableName
            ORDER BY ORDINAL_POSITION
        `;
        
        const result = await database.query(query, { tableName });
        res.json({
            success: true,
            tableName,
            columns: result.recordset
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch structure for table ${req.params.tableName}`,
            error: error.message 
        });
    }
});

// Get data from a specific table
app.get('/api/tables/:tableName/data', async (req, res) => {
    try {
        const { tableName } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        
        // Simple validation to prevent SQL injection
        const validTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        
        const query = `
            SELECT * FROM [${validTableName}]
            ORDER BY (SELECT NULL)
            OFFSET ${parseInt(offset)} ROWS
            FETCH NEXT ${parseInt(limit)} ROWS ONLY
        `;
        
        const result = await database.query(query);
        res.json({
            success: true,
            tableName: validTableName,
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch data from table ${req.params.tableName}`,
            error: error.message 
        });
    }
});

// Create a new rabbi
app.post('/api/rabbis', async (req, res) => {
    try {
        const rabbi = req.body;
        
        const query = `
            INSERT INTO dbo.Talmidei_Hahamim (
                FullName, knownAs, City, Country, Period,
                YearOfBirth, YearOfDeath,
                PlaceOfBirth, PlaceOfPtira, KnownFor, Notes, Sources,
                ImageUrl, URL, HebDob, HebDoP, Approx, HebCharDob, HebCharDoP
            ) VALUES (
                @FullName, @knownAs, @City, @Country, @Period,
                @YearOfBirth, @YearOfDeath,
                @PlaceOfBirth, @PlaceOfPtira, @KnownFor, @Notes, @Sources,
                @ImageUrl, @URL, @HebDob, @HebDoP, @Approx, @HebCharDob, @HebCharDoP
            );
            SELECT SCOPE_IDENTITY() AS RabbiID;
        `;
        
        const result = await database.query(query, rabbi);
        const newRabbiId = result.recordset[0].RabbiID;
        
        res.json({
            success: true,
            message: 'Rabbi created successfully',
            data: { RabbiID: newRabbiId, ...rabbi }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create rabbi',
            error: error.message 
        });
    }
});

// Update an existing rabbi
app.put('/api/rabbis/:rabbiId', async (req, res) => {
    try {
        const { rabbiId } = req.params;
        const rabbi = req.body;
        
        console.log('Updating rabbi:', rabbiId);
        console.log('Update data:', rabbi);
        
        // Build dynamic SET clause based on provided fields
        const updateFields = [];
        const params = { RabbiID: rabbiId };
        
        const allowedFields = [
            'FullName', 'knownAs', 'City', 'Country', 'Period',
            'YearOfBirth', 'YearOfDeath',
            'PlaceOfBirth', 'PlaceOfPtira', 'KnownFor', 'Notes', 'Sources',
            'ImageUrl', 'URL', 'HebDob', 'HebDoP', 'HebCharDob', 'HebCharDoP', 'Approx'
        ];
        
        allowedFields.forEach(field => {
            if (rabbi.hasOwnProperty(field)) {
                updateFields.push(`${field} = @${field}`);
                params[field] = rabbi[field];
            }
        });
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No fields to update'
            });
        }
        
        const query = `
            UPDATE dbo.Talmidei_Hahamim SET
                ${updateFields.join(',\n                ')}
            WHERE RabbiID = @RabbiID;
        `;
        
        console.log('Generated query:', query);
        console.log('Parameters:', params);
        
        const result = await database.query(query, params);
        
        res.json({
            success: true,
            message: 'Rabbi updated successfully',
            data: { RabbiID: rabbiId, ...rabbi }
        });
    } catch (error) {
        console.error('Error updating rabbi:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update rabbi',
            error: error.message 
        });
    }
});

// Get all talmidim relationships with joined data
app.get('/api/talmidim', async (req, res) => {
    try {
        const query = `
            SELECT 
                t.ID,
                t.RabbiId,
                t.Rabbi2Id,
                t.RelationshipCode,
                t.FromYear,
                t.ToYear,
                t.Place,
                t.Notes,
                r1.FullName AS Rabbi1Name,
                r1.knownAs AS Rabbi1KnownAs,
                r2.FullName AS Rabbi2Name,
                r2.knownAs AS Rabbi2KnownAs,
                rel.RelationshipName
            FROM dbo.Talmidim t
            LEFT JOIN dbo.Talmidei_Hahamim r1 ON t.RabbiId = r1.RabbiID
            LEFT JOIN dbo.Talmidei_Hahamim r2 ON t.Rabbi2Id = r2.RabbiID
            LEFT JOIN dbo.Relationships rel ON t.RelationshipCode = rel.RelationshipCode
            ORDER BY r1.FullName, r2.FullName
        `;
        
        const result = await database.query(query);
        console.log('Talmidim query returned', result.recordset.length, 'rows');
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching talmidim:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch talmidim relationships',
            error: error.message 
        });
    }
});

// Get all sforim
app.get('/api/sforim', async (req, res) => {
    try {
        const query = `
            SELECT 
                s.SeferID,
                s.Title,
                s.RabbiID,
                s.Author,
                s.YearPublished,
                s.Reference,
                r.FullName AS RabbiName,
                r.knownAs AS RabbiKnownAs
            FROM dbo.sforim s
            LEFT JOIN dbo.Talmidei_Hahamim r ON s.RabbiID = r.RabbiID
            ORDER BY s.SeferID ASC
        `;
        
        const result = await database.query(query);
        console.log('Sforim query returned', result.recordset.length, 'rows');
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (error) {
        console.error('Error fetching sforim:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch sforim',
            error: error.message 
        });
    }
});

// Create a new talmid (student-teacher relationship)
app.post('/api/talmidim', async (req, res) => {
    try {
        const talmid = req.body;
        
        const query = `
            INSERT INTO dbo.Talmidim (
                RabbiId, Rabbi2Id, RelationshipCode, FromYear, ToYear, Place, Notes
            ) VALUES (
                @RabbiId, @Rabbi2Id, @RelationshipCode, @FromYear, @ToYear, @Place, @Notes
            );
            SELECT SCOPE_IDENTITY() AS ID;
        `;
        
        const result = await database.query(query, talmid);
        const newTalmidId = result.recordset[0].ID;
        
        res.json({
            success: true,
            message: 'Talmid relationship created successfully',
            data: { ID: newTalmidId, ...talmid }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create talmid relationship',
            error: error.message 
        });
    }
});

// Update an existing talmid (student-teacher relationship)
app.put('/api/talmidim/:talmidId', async (req, res) => {
    try {
        const { talmidId } = req.params;
        const talmid = req.body;
        
        const query = `
            UPDATE dbo.Talmidim SET
                RabbiId = @RabbiId,
                Rabbi2Id = @Rabbi2Id,
                RelationshipCode = @RelationshipCode,
                FromYear = @FromYear,
                ToYear = @ToYear,
                Place = @Place,
                Notes = @Notes
            WHERE ID = @ID;
        `;
        
        const result = await database.query(query, { ...talmid, ID: talmidId });
        
        res.json({
            success: true,
            message: 'Talmid relationship updated successfully',
            data: { ID: talmidId, ...talmid }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update talmid relationship',
            error: error.message 
        });
    }
});

// Execute custom SQL query (be careful with this in production)
app.post('/api/query', async (req, res) => {
    try {
        const { query: sqlQuery } = req.body;
        
        if (!sqlQuery) {
            return res.status(400).json({
                success: false,
                message: 'SQL query is required'
            });
        }

        const result = await database.query(sqlQuery);
        res.json({
            success: true,
            data: result.recordset,
            rowsAffected: result.rowsAffected
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Query execution failed',
            error: error.message 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await database.close();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`RaboteinuZl API server running on http://localhost:${PORT}`);
    console.log(`Database: ${process.env.DB_DATABASE || 'NOT SET'}`);
    console.log(`Server: ${process.env.DB_SERVER || 'NOT SET'}`);
    console.log(`Port: ${process.env.DB_PORT || 'NOT SET'}`);
    console.log(`Working Directory: ${process.cwd()}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});