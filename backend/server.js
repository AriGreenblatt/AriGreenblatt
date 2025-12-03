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

// Get students (talmidim) for a specific rabbi
app.get('/api/rabbis/:rabbiId/students', async (req, res) => {
    try {
        const { rabbiId } = req.params;
        
        const query = `
            SELECT 
                t.ID,
                t.RabbiID,
                t.TeacherID,
                t.FromYear,
                t.ToYear,
                t.Place,
                t.Notes as StudentNotes,
                s.FullName as StudentName,
                s.HebrewName as StudentHebrewName,
                s.City as StudentCity,
                s.Country as StudentCountry,
                s.Period as StudentPeriod,
                s.YearOfBirth as StudentYearOfBirth,
                s.YearOfDeath as StudentYearOfDeath
            FROM Talmidim t
            INNER JOIN Talmidei_Hahamim s ON t.RabbiID = s.RabbiID
            WHERE t.TeacherID = @rabbiId
            ORDER BY s.FullName
        `;
        
        const result = await database.query(query, { rabbiId });
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch students for rabbi ${req.params.rabbiId}`,
            error: error.message 
        });
    }
});

// Get teachers (rabbis) for a specific student
app.get('/api/rabbis/:rabbiId/teachers', async (req, res) => {
    try {
        const { rabbiId } = req.params;
        
        const query = `
            SELECT 
                t.ID,
                t.RabbiID,
                t.TeacherID,
                t.FromYear,
                t.ToYear,
                t.Place,
                t.Notes as TeacherNotes,
                s.FullName as TeacherName,
                s.HebrewName as TeacherHebrewName,
                s.City as TeacherCity,
                s.Country as TeacherCountry,
                s.Period as TeacherPeriod,
                s.YearOfBirth as TeacherYearOfBirth,
                s.YearOfDeath as TeacherYearOfDeath
            FROM Talmidim t
            INNER JOIN Talmidei_Hahamim s ON t.TeacherID = s.RabbiID
            WHERE t.RabbiID = @rabbiId
            ORDER BY s.FullName
        `;
        
        const result = await database.query(query, { rabbiId });
        res.json({
            success: true,
            data: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: `Failed to fetch teachers for rabbi ${req.params.rabbiId}`,
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