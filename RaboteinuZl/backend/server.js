require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./database');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const extractor = require('./wikipedia-extractor');
const sharp = require('sharp');
const axios = require('axios');

const app = express();
const PORT = process.env.API_PORT || 3000;
const ODOT_DIR = path.join(__dirname, 'odot');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'RaboteinuZl API is running',
        timestamp: new Date().toISOString() 
    });
});

// Get biographical content (Odot) - checks file first, then Wikipedia, then database
app.get('/api/odot/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const fileName = `${title.replace(/[^a-zA-Z0-9א-ת]/g, '_')}.txt`;
        const filePath = path.join(ODOT_DIR, fileName);
        
        // 1. Check if text file exists
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return res.json({
                success: true,
                data: {
                    title: title,
                    content: content,
                    source: 'file'
                }
            });
        }
        
        // 2. Try Wikipedia - get full parsed HTML content
        const encodedTitle = encodeURIComponent(title);
        const apiUrl = `https://he.wikipedia.org/w/api.php?action=parse&format=json&page=${encodedTitle}&prop=text&redirects=1`;
        
        const options = {
            headers: {
                'User-Agent': 'RaboteinuZl/1.0 (https://github.com/GreenblattArie/Hazal; contact@example.com)'
            }
        };
        
        https.get(apiUrl, options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    
                    if (jsonData.error) {
                        return res.json({
                            success: false,
                            message: 'Content not found in file or Wikipedia',
                            title: title
                        });
                    }
                    
                    const content = jsonData.parse.text['*'] || '';
                    const pageTitle = jsonData.parse.title || title;
                    
                    // Optionally auto-save to file for future use
                    // Uncomment next line to enable auto-caching
                    // fs.writeFileSync(filePath, content, 'utf8');
                    
                    res.json({
                        success: true,
                        data: {
                            title: pageTitle,
                            content: content,
                            source: 'wikipedia',
                            pageId: jsonData.parse.pageid
                        }
                    });
                } catch (parseError) {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to parse Wikipedia response',
                        error: parseError.message
                    });
                }
            });
        }).on('error', (error) => {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch content',
                error: error.message
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Request failed',
            error: error.message
        });
    }
});

// Save biographical content to file
app.post('/api/odot/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const { content } = req.body;
        
        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Content is required'
            });
        }
        
        const fileName = `${title.replace(/[^a-zA-Z0-9א-ת]/g, '_')}.txt`;
        const filePath = path.join(ODOT_DIR, fileName);
        
        fs.writeFileSync(filePath, content, 'utf8');
        
        res.json({
            success: true,
            message: 'Content saved successfully',
            title: title,
            fileName: fileName
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to save content',
            error: error.message
        });
    }
});

// List all available odot files
app.get('/api/odot', (req, res) => {
    try {
        const files = fs.readdirSync(ODOT_DIR)
            .filter(file => file.endsWith('.txt'))
            .map(file => ({
                fileName: file,
                title: file.replace('.txt', '').replace(/_/g, ' ')
            }));
        
        res.json({
            success: true,
            count: files.length,
            files: files
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to list odot files',
            error: error.message
        });
    }
});

// Wikipedia API endpoint - Fetch Hebrew Wikipedia content
app.get('/api/wikipedia/:title', async (req, res) => {
    try {
        const { title } = req.params;
        const encodedTitle = encodeURIComponent(title);
        
        // Hebrew Wikipedia API endpoint
        const apiUrl = `https://he.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&exintro=false&titles=${encodedTitle}&redirects=1`;
        
        https.get(apiUrl, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    const pages = jsonData.query.pages;
                    const pageId = Object.keys(pages)[0];
                    
                    if (pageId === '-1') {
                        return res.json({
                            success: false,
                            message: 'Wikipedia article not found',
                            title: title
                        });
                    }
                    
                    const page = pages[pageId];
                    res.json({
                        success: true,
                        title: page.title,
                        content: page.extract || '',
                        pageId: pageId
                    });
                } catch (parseError) {
                    res.status(500).json({
                        success: false,
                        message: 'Failed to parse Wikipedia response',
                        error: parseError.message
                    });
                }
            });
        }).on('error', (error) => {
            res.status(500).json({
                success: false,
                message: 'Failed to fetch from Wikipedia',
                error: error.message
            });
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Wikipedia request failed',
            error: error.message
        });
    }
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

// Search for rabbis by name
app.get('/api/rabbis', async (req, res) => {
    const { search } = req.query;
    
    if (!search) {
        return res.status(400).json({
            success: false,
            message: 'Search parameter is required'
        });
    }
    
    try {
        const pool = await database.poolPromise;
        
        // Search by Hebrew name or Full name (using translations table)
        const result = await pool.request()
            .input('searchTerm', database.sql.NVarChar, search)
            .query(`
                SELECT TOP 10 
                    t.RabbiID, 
                    tr.FullName,
                    tr.KnownAs,
                    t.YearOfBirth, 
                    t.YearPtira
                FROM Talmidei_Hahamim t
                LEFT JOIN Talmidei_Hahamim_Translations tr ON t.RabbiID = tr.RabbiID AND tr.LanguageCode = 'he'
                WHERE tr.FullName LIKE '%' + @searchTerm + '%'
                   OR tr.KnownAs LIKE '%' + @searchTerm + '%'
                   OR tr.FullName = @searchTerm
                   OR tr.KnownAs = @searchTerm
                ORDER BY 
                    CASE 
                        WHEN tr.FullName = @searchTerm THEN 1
                        WHEN tr.KnownAs = @searchTerm THEN 2
                        ELSE 3
                    END
            `);
        
        res.json({
            success: true,
            results: result.recordset,
            count: result.recordset.length
        });
    } catch (error) {
        console.error('Error searching rabbis:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Check if rabbi already exists in database
app.post('/api/check-duplicate', async (req, res) => {
    const { fullName, hebrewName } = req.body;
    
    try {
        const pool = await database.poolPromise;
        
        // Search by Hebrew name only (avoiding FullName column which may not exist)
        const result = await pool.request()
            .input('hebrewName', database.sql.NVarChar, hebrewName || '')
            .query(`
                SELECT TOP 1 *
                FROM Talmidei_Hahamim
                WHERE HebFullName = @hebrewName 
                   OR HebFullName LIKE '%' + @hebrewName + '%'
            `);
        
        if (result.recordset.length > 0) {
            const existingRabbi = result.recordset[0];
            
            // Get related data with error handling
            let books = { recordset: [] };
            let events = { recordset: [] };
            let relationships = { recordset: [] };
            
            try {
                books = await pool.request()
                    .input('rabbiId', database.sql.Int, existingRabbi.RabbiID)
                    .query('SELECT * FROM Sforim WHERE RabbiID = @rabbiId');
            } catch (e) {
                console.log('Could not fetch books:', e.message);
            }
            
            try {
                events = await pool.request()
                    .input('rabbiId', database.sql.Int, existingRabbi.RabbiID)
                    .query('SELECT * FROM Events_and_facts WHERE RabbiID = @rabbiId');
            } catch (e) {
                console.log('Could not fetch events:', e.message);
            }
            
            try {
                relationships = await pool.request()
                    .input('rabbiId', database.sql.Int, existingRabbi.RabbiID)
                    .query('SELECT * FROM AssociatedWith WHERE RabbiID = @rabbiId');
            } catch (e) {
                console.log('Could not fetch relationships:', e.message);
            }
            
            res.json({
                exists: true,
                message: 'כבר נמצא במאגר',
                existing: {
                    rabbi: existingRabbi,
                    books: books.recordset,
                    events: events.recordset,
                    relationships: relationships.recordset
                }
            });
        } else {
            res.json({
                exists: false,
                message: 'לא נמצא - ניתן להוסיף'
            });
        }
    } catch (error) {
        console.error('Error checking duplicate:', error);
        res.status(500).json({ error: error.message });
    }
});

// Extract rabbi data from Wikipedia
app.post('/api/extract-wikipedia', async (req, res) => {
    try {
        const { url, name } = req.body;
        
        // Check for valid inputs (handle undefined, null, and empty strings)
        const hasUrl = url && url.trim();
        const hasName = name && name.trim();
        
        if (!hasUrl && !hasName) {
            return res.status(400).json({
                success: false,
                message: 'Either URL or name is required'
            });
        }
        
        // Extract page title from URL or use provided name
        let pageTitle = hasName ? name.trim() : '';
        if (hasUrl) {
            const urlMatch = url.match(/wiki\/(.+)$/);
            if (urlMatch) {
                pageTitle = decodeURIComponent(urlMatch[1]);
            }
        }
        
        if (!pageTitle || !pageTitle.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Could not determine Wikipedia page title'
            });
        }
        
        // If only a name was provided (no URL), search Wikipedia first to find the correct page
        if (!hasUrl && hasName) {
            try {
                // Search variations
                const searchVariations = [pageTitle];
                
                // Remove common prefixes for searching
                const withoutPrefix = pageTitle
                    .replace(/^ר\s+/, '')
                    .replace(/^רבי\s+/, '')
                    .replace(/^הרב\s+/, '')
                    .replace(/^רב\s+/, '');
                
                if (withoutPrefix !== pageTitle) {
                    searchVariations.push(withoutPrefix);
                }
                
                // Try each search variation
                let searchResult = null;
                for (const searchTerm of searchVariations) {
                    const encodedSearch = encodeURIComponent(searchTerm);
                    const searchUrl = `https://he.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodedSearch}&limit=5`;
                    
                    const searchData = await extractor.fetchWikipedia(searchUrl);
                    
                    if (searchData && searchData[1] && searchData[1].length > 0) {
                        // Use the first search result
                        pageTitle = searchData[1][0];
                        searchResult = {
                            title: searchData[1][0],
                            url: searchData[3][0]
                        };
                        break;
                    }
                }
                
                if (!searchResult) {
                    return res.json({
                        success: false,
                        message: `לא נמצא בוויקיפדיה: ${pageTitle}`,
                        title: pageTitle
                    });
                }
            } catch (searchError) {
                console.error('Wikipedia search error:', searchError);
                // Continue with original title
            }
        }
        
        // Step 1: Check database first
        let dbData = null;
        try {
            const pool = await database.poolPromise;
            console.log(`[Extract] Searching database for: "${pageTitle}"`);
            const result = await pool.request()
                .input('hebrewName', database.sql.NVarChar, pageTitle)
                .query(`
                    SELECT TOP 1 t.*, tr.FullName, tr.KnownAs, tr.City, tr.Country, tr.Period, 
                           tr.PlaceOfBirth, tr.PlaceOfPtira, tr.KnownFor, tr.Notes, tr.Sources, tr.URL
                    FROM Talmidei_Hahamim t
                    LEFT JOIN Talmidei_Hahamim_Translations tr ON t.RabbiID = tr.RabbiID AND tr.LanguageCode = 'he'
                    WHERE t.HebFullName = @hebrewName 
                       OR t.HebFullName LIKE '%' + @hebrewName + '%'
                       OR tr.FullName = @hebrewName 
                       OR tr.FullName LIKE '%' + @hebrewName + '%'
                       OR tr.KnownAs = @hebrewName
                       OR tr.KnownAs LIKE '%' + @hebrewName + '%'
                    ORDER BY 
                        CASE 
                            WHEN t.HebFullName = @hebrewName THEN 1
                            WHEN tr.FullName = @hebrewName THEN 2
                            WHEN tr.KnownAs = @hebrewName THEN 3
                            ELSE 4
                        END
                `);
            
            if (result.recordset.length > 0) {
                dbData = result.recordset[0];
                console.log(`[Extract] Found existing rabbi in database: RabbiID=${dbData.RabbiID}, FullName=${dbData.FullName || dbData.HebFullName}`);
                
                // Get related data
                const books = await pool.request()
                    .input('rabbiId', database.sql.Int, dbData.RabbiID)
                    .query('SELECT * FROM Sforim WHERE RabbiID = @rabbiId');
                
                const events = await pool.request()
                    .input('rabbiId', database.sql.Int, dbData.RabbiID)
                    .query('SELECT * FROM Events_and_facts WHERE RabbiID = @rabbiId');
                
                const relationships = await pool.request()
                    .input('rabbiId', database.sql.Int, dbData.RabbiID)
                    .query('SELECT * FROM AssociatedWith WHERE RabbiID = @rabbiId');
                
                dbData.Sforim = books.recordset;
                dbData.Events = events.recordset;
                dbData.Talmidim = relationships.recordset;
            } else {
                console.log(`[Extract] No existing rabbi found in database for: "${pageTitle}"`);
            }
        } catch (dbError) {
            console.error('Database check failed:', dbError);
            // Continue with Wikipedia extraction even if DB check fails
        }
        
        // Step 2: Fetch Wikipedia page using parse API for full HTML
        const encodedTitle = encodeURIComponent(pageTitle);
        const apiUrl = `https://he.wikipedia.org/w/api.php?action=parse&format=json&page=${encodedTitle}&prop=text&redirects=1`;
        
        const wikiData = await extractor.fetchWikipedia(apiUrl);
        
        if (!wikiData.parse) {
            return res.json({
                success: false,
                message: 'Wikipedia page not found',
                title: pageTitle
            });
        }
        
        const html = wikiData.parse.text['*'];
        const actualTitle = wikiData.parse.title;
        
        // Extract structured data
        const { rabbi, confidence: rabbiConfidence } = extractor.extractRabbiData(html, actualTitle);
        const books = extractor.extractBooks(html);
        const relationships = extractor.extractRelationships(html);
        const events = extractor.extractEvents(html);
        
        // Step 3: Merge database data with Wikipedia data
        let mergedData = { ...rabbi };
        let fieldSources = {}; // Track source for each field
        let mergedBooks = [...books];
        let mergedEvents = [...events];
        let mergedRelationships = [...relationships];
        
        if (dbData) {
            // First, populate with database values and mark as 'database'
            for (const key in dbData) {
                if (key !== 'Sforim' && key !== 'Talmidim' && dbData[key] !== null && dbData[key] !== '' && dbData[key] !== undefined) {
                    mergedData[key] = dbData[key];
                    fieldSources[key] = 'database';
                }
            }
            
            // Merge Sforim - keep DB ones (with IDs), add new from Wikipedia
            const dbSforimTitles = (dbData.Sforim || []).map(s => s.Title || s.HebTitle);
            const newBooks = books.filter(b => !dbSforimTitles.includes(b.title || b.Title));
            mergedBooks = [...(dbData.Sforim || []), ...newBooks];
            
            // Merge Events - keep DB ones (with IDs), add new from Wikipedia  
            const dbEventDescriptions = (dbData.Events || []).map(e => e.HebEventDescription);
            const newEvents = events.filter(e => !dbEventDescriptions.includes(e.HebEventDescription || e.EventDescription));
            mergedEvents = [...(dbData.Events || []), ...newEvents];
            
            // Merge Relationships - keep DB ones (with IDs), add new from Wikipedia
            const dbRelNames = (dbData.Talmidim || []).map(r => r.HebFullName);
            const newRels = relationships.filter(r => !dbRelNames.includes(r.name));
            mergedRelationships = [...(dbData.Talmidim || []), ...newRels];
            mergedRelationships = [...(dbData.Talmidim || []), ...newRels];
            
            // Then, overlay Wikipedia values for fields that were empty in DB
            for (const key in rabbi) {
                if (fieldSources[key] !== 'database' && rabbi[key] !== null && rabbi[key] !== '' && rabbi[key] !== undefined) {
                    mergedData[key] = rabbi[key];
                    fieldSources[key] = 'wikipedia';
                }
            }
        } else {
            // No DB data, all fields from Wikipedia
            for (const key in rabbi) {
                if (rabbi[key] !== null && rabbi[key] !== '' && rabbi[key] !== undefined) {
                    fieldSources[key] = 'wikipedia';
                }
            }
        }
        
        // Set Wikipedia URL
        mergedData.URL = `https://he.wikipedia.org/wiki/${encodeURIComponent(actualTitle)}`;
        
        // Extract image from rabbi's page
        const rabbiImageUrl = extractor.extractImageUrl(html);
        if (rabbiImageUrl && !fieldSources['ImageUrl']) {
            mergedData.ImageUrl = rabbiImageUrl;
            fieldSources['ImageUrl'] = 'wikipedia';
        }
        
        // If we have a city, try to fetch its map
        if (mergedData.City) {
            try {
                const cityData = await extractor.fetchCityMap(mergedData.City);
                if (cityData && cityData.imageUrl && !fieldSources['wiki_city_map_url']) {
                    // Store city map in separate field
                    mergedData.wiki_city_map_url = cityData.imageUrl;
                    fieldSources['wiki_city_map_url'] = 'wikipedia';
                }
            } catch (error) {
                console.log(`Could not fetch city map for ${mergedData.City}`);
            }
        }
        
        // Set Assumed flag if birth year has low confidence (estimated)
        if (rabbiConfidence.fields.YearOfBirth && rabbiConfidence.fields.YearOfBirth < 60 && !fieldSources['Assumed']) {
            mergedData.Assumed = 1;
            fieldSources['Assumed'] = 'wikipedia';
        }
        
        // Calculate overall confidence
        const allConfidences = [
            rabbiConfidence.overall,
            mergedBooks.length > 0 ? 75 : 0,
            mergedRelationships.length > 0 ? 70 : 0,
            mergedEvents.length > 0 ? 50 : 0
        ].filter(c => c > 0);
        
        const overallConfidence = allConfidences.length > 0
            ? Math.round(allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length)
            : 0;
        
        // Log final merged data for debugging
        console.log(`[Extract] Sending response: databaseRecord=${dbData ? true : false}, RabbiID=${mergedData.RabbiID || 'N/A'}`);
        
        res.json({
            success: true,
            data: {
                rabbi: mergedData,
                fieldSources: fieldSources, // 'database' or 'wikipedia' for each field
                books: mergedBooks,
                relationships: mergedRelationships,
                events: mergedEvents,
                confidence: {
                    overall: overallConfidence,
                    rabbi: rabbiConfidence.fields,
                    booksCount: mergedBooks.length,
                    relationshipsCount: mergedRelationships.length,
                    eventsCount: mergedEvents.length
                },
                databaseRecord: dbData ? true : false, // Indicate if DB record was found
                source: {
                    title: actualTitle,
                    url: mergedData.URL,
                    pageId: wikiData.parse.pageid
                }
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Extraction failed',
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
        const { limit = 100, offset = 0, languageCode = 'he' } = req.query;
        
        // Simple validation to prevent SQL injection
        const validTableName = tableName.replace(/[^a-zA-Z0-9_]/g, '');
        
        let query;
        
        // Special handling for multi-language tables
        if (validTableName === 'Talmidei_Hahamim') {
            query = `
                SELECT 
                    t.ID,
                    t.RabbiID, 
                    t.YearOfBirth, 
                    t.YearPtira, 
                    t.HebDob, 
                    t.HebDoP,
                    t.ImageUrl,
                    t.Assumed,
                    t.wiki_city_map_url,
                    tr.FullName,
                    tr.KnownAs as knownAs,
                    tr.City,
                    tr.Country,
                    tr.Period,
                    tr.PlaceOfBirth,
                    tr.PlaceOfPtira,
                    tr.KnownFor,
                    tr.Notes,
                    tr.Sources,
                    tr.URL
                FROM Talmidei_Hahamim t
                LEFT JOIN Talmidei_Hahamim_Translations tr ON t.RabbiID = tr.RabbiID AND tr.LanguageCode = '${languageCode}'
                ORDER BY t.RabbiID
                OFFSET ${parseInt(offset)} ROWS
                FETCH NEXT ${parseInt(limit)} ROWS ONLY
            `;
        } else {
            // Default query for non-multilingual tables
            query = `
                SELECT * FROM [${validTableName}]
                ORDER BY (SELECT NULL)
                OFFSET ${parseInt(offset)} ROWS
                FETCH NEXT ${parseInt(limit)} ROWS ONLY
            `;
        }
        
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

        console.log('[Query] Executing SQL:', sqlQuery);
        const result = await database.query(sqlQuery);
        console.log('[Query] Result - rowsAffected:', result.rowsAffected);
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

// Create new rabbi
app.post('/api/rabbis', async (req, res) => {
    try {
        const rabbi = req.body;
        const result = await database.createRabbi(rabbi);
        res.json({
            success: true,
            rabbiID: result
        });
    } catch (error) {
        console.error('Create rabbi error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create rabbi',
            error: error.message
        });
    }
});

// Check for duplicate rabbi by full name
app.get('/api/check-duplicate/:fullName', async (req, res) => {
    try {
        const fullName = decodeURIComponent(req.params.fullName);
        console.log('Checking for duplicate:', fullName);
        
        // Search for exact match or similar names
        const query = `
            SELECT TOP 5 RabbiID, FullName, HebCharDob, HebCharDoP, City, Period 
            FROM Talmidei_Hahamim 
            WHERE FullName = N'${fullName.replace(/'/g, "''")}'
            OR FullName LIKE N'%${fullName.replace(/'/g, "''")}%'
            ORDER BY 
                CASE WHEN FullName = N'${fullName.replace(/'/g, "''")}' THEN 0 ELSE 1 END,
                LEN(FullName)
        `;
        
        const result = await database.query(query);
        
        res.json({
            success: true,
            duplicates: result.recordset || [],
            hasDuplicate: result.recordset && result.recordset.length > 0
        });
    } catch (error) {
        console.error('Check duplicate error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check for duplicates',
            error: error.message
        });
    }
});

// Create association (relationship) between rabbis
app.post('/api/associations', async (req, res) => {
    try {
        const association = req.body;
        const result = await database.createAssociation(association);
        res.json({
            success: true,
            associationID: result
        });
    } catch (error) {
        console.error('Create association error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create association',
            error: error.message
        });
    }
});

// Create new book
app.post('/api/books', async (req, res) => {
    try {
        const book = req.body;
        const result = await database.createBook(book);
        res.json({
            success: true,
            seferID: result
        });
    } catch (error) {
        console.error('Create book error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create book',
            error: error.message
        });
    }
});

// Create new event
app.post('/api/events', async (req, res) => {
    try {
        const event = req.body;
        const result = await database.createEvent(event);
        res.json({
            success: true,
            eventID: result
        });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create event',
            error: error.message
        });
    }
});

// Fetch city/location map from Wikipedia
app.get('/api/city-map/:cityName', async (req, res) => {
    try {
        // Decode URI component to handle Hebrew characters properly
        const cityName = decodeURIComponent(req.params.cityName);
        console.log('Received city name:', cityName);
        
        if (!cityName || cityName === 'undefined' || cityName === 'null' || !cityName.trim()) {
            console.log('Empty or invalid city name received');
            return res.json({
                success: false,
                message: 'Invalid city name'
            });
        }
        
        const cityData = await extractor.fetchCityMap(cityName);
        
        if (cityData) {
            // Add the original Hebrew city name to the response
            cityData.hebrewCityName = cityName;
            res.json({
                success: true,
                data: cityData
            });
        } else {
            res.json({
                success: false,
                message: 'Wikipedia page not found'
            });
        }
    } catch (error) {
        console.error('Fetch city map error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch city map',
            error: error.message
        });
    }
});

// Generate city map with label overlay
app.get('/api/city-map-with-label/:cityName', async (req, res) => {
    try {
        const cityName = decodeURIComponent(req.params.cityName);
        console.log('Generating labeled map for:', cityName);
        
        const cityData = await extractor.fetchCityMap(cityName);
        
        if (!cityData || !cityData.imageUrl) {
            return res.status(404).json({ success: false, message: 'Map not found' });
        }
        
        // Download the base map image using axios (handles redirects automatically)
        const imageUrl = cityData.imageUrl.startsWith('http') ? cityData.imageUrl : 'https:' + cityData.imageUrl;
        console.log('Downloading image from:', imageUrl);
        
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            maxRedirects: 5,
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const imageBuffer = Buffer.from(imageResponse.data);
        console.log(`Downloaded ${imageBuffer.length} bytes`);
        console.log(`Content type: ${imageResponse.headers['content-type']}`);
        
        // Check if we got an error page instead of an image
        if (imageBuffer.length < 500 || !imageResponse.headers['content-type'].startsWith('image/')) {
            console.log('Received non-image response');
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid image data received from Wikipedia' 
            });
        }
        
        // Check if it's an SVG
        const contentType = imageResponse.headers['content-type'] || '';
        const isSvg = contentType.includes('svg') || imageUrl.toLowerCase().endsWith('.svg');
        
        if (isSvg) {
            console.log('SVG detected, cannot add text overlay with sharp');
            // For SVG, return error and client will use HTML overlay
            return res.status(400).json({
                success: false,
                useFallback: true,
                message: 'SVG format requires HTML overlay'
            });
        }
        
        // City label positions (where to draw the text on PNG)
        // Red dot is at approximately x:88, y:107 for Mainz - text positioned to the right
        const positions = {
            'Mainz': { x: 97, y: 107 },
            'Worms': { x: 97, y: 120 },
            'Speyer': { x: 97, y: 135 },
            'Jerusalem': { x: 109, y: 145 },
            'Safed': { x: 114, y: 130 },
            'Tiberias': { x: 112, y: 140 }
        };
        
        const pos = positions[cityData.cityName] || { x: 100, y: 115 };
        const hebrewText = cityData.hebrewCityName || cityName;
        
        console.log(`Positioning text at x:${pos.x}, y:${pos.y}`);
        console.log(`Hebrew text: ${hebrewText}`);
        
        // Process the image with sharp
        let processedImage = sharp(imageBuffer);
        
        // Get metadata to check format
        const metadata = await processedImage.metadata();
        console.log(`Image format: ${metadata.format}, width: ${metadata.width}, height: ${metadata.height}`);
        
        // Convert to PNG first to ensure compatibility
        const pngBuffer = await processedImage.png().toBuffer();
        
        // Create SVG text overlay with Miriam font for Hebrew readability
        const svgText = `
            <svg width="${metadata.width}" height="${metadata.height}">
                <text x="${pos.x}" y="${pos.y}" 
                      font-family="Miriam, David, Arial, sans-serif" font-size="7" font-weight="normal"
                      fill="#000000">
                    ${hebrewText}
                </text>
            </svg>
        `;
        
        // Composite the text onto the PNG image
        const outputBuffer = await sharp(pngBuffer)
            .composite([{
                input: Buffer.from(svgText),
                top: 0,
                left: 0
            }])
            .png()
            .toBuffer();
        
        console.log('Successfully generated labeled image');
        console.log('Successfully generated labeled image');
        res.set('Content-Type', 'image/png');
        res.send(outputBuffer);
        
    } catch (err) {
        console.error('Image processing error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Search Wikipedia for a rabbi with fuzzy matching
app.get('/api/search-wikipedia/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        // Helper function to search Wikipedia API
        const searchWikipedia = (searchTerm) => {
            return new Promise((resolve, reject) => {
                const encodedName = encodeURIComponent(searchTerm);
                const apiUrl = `https://he.wikipedia.org/w/api.php?action=opensearch&format=json&search=${encodedName}&limit=5`;
                
                https.get(apiUrl, {
                    headers: {
                        'User-Agent': 'RaboteinuZl/1.0 (https://github.com/GreenblattArie/Hazal; contact@example.com)'
                    }
                }, (apiRes) => {
                    apiRes.setEncoding('utf8');
                    let data = '';
                    
                    apiRes.on('data', (chunk) => {
                        data += chunk;
                    });
                    
                    apiRes.on('end', () => {
                        try {
                            const result = JSON.parse(data);
                            resolve(result);
                        } catch (e) {
                            reject(e);
                        }
                    });
                }).on('error', reject);
            });
        };
        
        // Generate search variations
        const searchVariations = [name];
        
        // Remove common prefixes
        const withoutPrefix = name
            .replace(/^ר\s+/, '')
            .replace(/^רבי\s+/, '')
            .replace(/^הרב\s+/, '')
            .replace(/^רב\s+/, '');
        
        if (withoutPrefix !== name) {
            searchVariations.push(withoutPrefix);
        }
        
        // Try search with each variation
        for (const searchTerm of searchVariations) {
            const result = await searchWikipedia(searchTerm);
            
            if (result[1] && result[1].length > 0 && result[3] && result[3].length > 0) {
                // Return first result
                res.json({
                    found: true,
                    title: result[1][0],
                    url: result[3][0],
                    allResults: result[1].map((title, i) => ({
                        title: title,
                        url: result[3][i]
                    }))
                });
                return;
            }
        }
        
        // No results found
        res.json({
            found: false
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
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