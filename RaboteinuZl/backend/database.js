// Choose driver based on auth mode: 'sql' (default) or 'windows'
let sql;
const authMode = (process.env.DB_AUTH || 'sql').toLowerCase();
try {
    sql = authMode === 'windows' ? require('mssql/msnodesqlv8') : require('mssql');
} catch (e) {
    // Fallback to default driver if msnodesqlv8 is not installed
    sql = require('mssql');
}
require('dotenv').config({ path: __dirname + '/.env' });

// Derive host and instance from DB_SERVER (e.g., "localhost\\SQLEXPRESS")
const rawServer = process.env.DB_SERVER || 'localhost\\SQLEXPRESS';
let serverHost = rawServer;
let instanceName = undefined;
if (rawServer.includes('\\')) {
    const [host, instance] = rawServer.split('\\');
    serverHost = host;
    instanceName = instance;
}

// Build config depending on authentication mode
const baseConfig = {
    server: serverHost,
    database: process.env.DB_DATABASE || 'master',
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 30000,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        instanceName: instanceName,
        enableArithAbort: true,
        useUTC: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

const config = authMode === 'windows'
    ? {
            ...baseConfig,
            driver: 'msnodesqlv8',
            // For Windows Auth, provide a connection string to ensure correct driver usage
            connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${rawServer};Database=${process.env.DB_DATABASE || 'master'};Trusted_Connection=yes;`,
            options: {
                ...baseConfig.options,
                trustedConnection: true
            }
        }
    : {
            ...baseConfig,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD
        };

class DatabaseConnection {
    constructor() {
        this.pool = null;
    }

    async connect() {
        try {
            if (!this.pool) {
                this.pool = await sql.connect(config);
                console.log('Connected to MSSQL database:', config.database);
            }
            return this.pool;
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    async query(queryText, params = {}) {
        try {
            await this.connect();
            const request = this.pool.request();
            
            // Add parameters if provided
            Object.keys(params).forEach(key => {
                request.input(key, params[key]);
            });

            const result = await request.query(queryText);
            return result;
        } catch (error) {
            console.error('Query execution failed:', error);
            throw error;
        }
    }

    async close() {
        try {
            if (this.pool) {
                await this.pool.close();
                this.pool = null;
                console.log('Database connection closed');
            }
        } catch (error) {
            console.error('Error closing database connection:', error);
        }
    }

    async createRabbi(rabbi, languageCode = 'he') {
        try {
            await this.connect();
            const transaction = new sql.Transaction(this.pool);
            await transaction.begin();

            try {
                // Determine if data is assumed/approximate (confidence < 60 or explicitly marked)
                const isAssumed = rabbi.Assumed === true || rabbi.Assumed === 1 ? 1 : 0;
                
                // Insert core data (language-agnostic)
                const coreRequest = new sql.Request(transaction);
                coreRequest.input('HebFullName', sql.NVarChar, rabbi.HebFullName || rabbi.FullName || rabbi.knownAs || '');
                coreRequest.input('HebPlaceOfBirth', sql.NVarChar, rabbi.HebPlaceOfBirth || rabbi.PlaceOfBirth || '');
                coreRequest.input('HebPlaceOfPtira', sql.NVarChar, rabbi.HebPlaceOfPtira || rabbi.PlaceOfPtira || '');
                coreRequest.input('YearOfBirth', sql.Int, rabbi.YearOfBirth || null);
                coreRequest.input('YearOfDeath', sql.Int, rabbi.YearOfDeath || null);
                coreRequest.input('HebDob', sql.Int, rabbi.HebDob || null);
                coreRequest.input('HebDoP', sql.Int, rabbi.HebDoP || null);
                coreRequest.input('Assumed', sql.TinyInt, isAssumed);
                coreRequest.input('ImageUrl', sql.NVarChar, rabbi.ImageUrl || '');
                coreRequest.input('wiki_city_map_url', sql.NVarChar, rabbi.wiki_city_map_url || '');
                coreRequest.input('id', sql.Int, 0);

                const coreResult = await coreRequest.query(`
                    INSERT INTO Talmidei_Hahamim 
                    (HebFullName, HebPlaceOfBirth, HebPlaceOfPtira, YearOfBirth, YearOfDeath, HebDob, HebDoP, Assumed, ImageUrl, wiki_city_map_url, id)
                    VALUES 
                    (@HebFullName, @HebPlaceOfBirth, @HebPlaceOfPtira, @YearOfBirth, @YearOfDeath, @HebDob, @HebDoP, @Assumed, @ImageUrl, @wiki_city_map_url, @id);
                    SELECT SCOPE_IDENTITY() AS RabbiID;
                `);

                const rabbiID = coreResult.recordset[0].RabbiID;

                // Insert translation data
                const transRequest = new sql.Request(transaction);
                transRequest.input('RabbiID', sql.Int, rabbiID);
                transRequest.input('LanguageCode', sql.NVarChar, languageCode);
                transRequest.input('FullName', sql.NVarChar, rabbi.FullName || null);
                transRequest.input('knownAs', sql.NVarChar, rabbi.knownAs || null);
                transRequest.input('City', sql.NVarChar, rabbi.City || null);
                transRequest.input('Country', sql.NVarChar, rabbi.Country || null);
                transRequest.input('Period', sql.NVarChar, rabbi.Period || null);
                transRequest.input('PlaceOfBirth', sql.NVarChar, rabbi.PlaceOfBirth || null);
                transRequest.input('PlaceOfPtira', sql.NVarChar, rabbi.PlaceOfPtira || null);
                transRequest.input('KnownFor', sql.NVarChar, rabbi.KnownFor || null);
                transRequest.input('Notes', sql.NVarChar, rabbi.Notes || null);
                transRequest.input('Sources', sql.NVarChar, rabbi.Sources || null);
                transRequest.input('URL', sql.NVarChar, rabbi.URL || null);

                await transRequest.query(`
                    INSERT INTO Talmidei_Hahamim_Translations
                    (RabbiID, LanguageCode, FullName, KnownAs, City, Country, Period,
                     PlaceOfBirth, PlaceOfPtira, KnownFor, Notes, Sources, URL)
                    VALUES
                    (@RabbiID, @LanguageCode, @FullName, @knownAs, @City, @Country, @Period,
                     @PlaceOfBirth, @PlaceOfPtira, @KnownFor, @Notes, @Sources, @URL);
                `);

                await transaction.commit();
                return rabbiID;
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('Create rabbi failed:', error);
            throw error;
        }
    }

    async createAssociation(association) {
        try {
            await this.connect();
            const request = new sql.Request(this.pool);
            
            request.input('FromYear', sql.Int, association.FromYear || null);
            request.input('ToYear', sql.Int, association.ToYear || null);
            request.input('HebPlace', sql.NVarChar, association.HebPlace || null);
            request.input('HebNotes', sql.NVarChar, association.HebNotes || null);
            request.input('FamilyCode', sql.Int, association.FamilyCode);
            request.input('RabbiId', sql.Int, association.RabbiId);
            request.input('Rabbi2Id', sql.Int, association.Rabbi2Id);
            request.input('RelationshipCode', sql.Int, association.RelationshipCode);
            request.input('IsApprox', sql.TinyInt, association.IsApprox);

            const result = await request.query(`
                INSERT INTO AssociatedWith 
                (FromYear, ToYear, HebPlace, HebNotes, FamilyCode, RabbiId, Rabbi2Id, RelationshipCode, IsApprox)
                VALUES 
                (@FromYear, @ToYear, @HebPlace, @HebNotes, @FamilyCode, @RabbiId, @Rabbi2Id, @RelationshipCode, @IsApprox);
                SELECT SCOPE_IDENTITY() AS AssociationID;
            `);

            return result.recordset[0].AssociationID;
        } catch (error) {
            console.error('Create association failed:', error);
            throw error;
        }
    }

    async createBook(book) {
        try {
            await this.connect();
            const request = new sql.Request(this.pool);
            
            request.input('HebTitle', sql.NVarChar(300), book.HebTitle);
            request.input('RabbiID', sql.Int, book.RabbiID);
            request.input('HebAuthor', sql.NVarChar(200), book.HebAuthor || null);
            request.input('YearPublished', sql.Int, book.YearPublished || null);
            request.input('HebReference', sql.NVarChar(sql.MAX), book.HebReference || null);

            const result = await request.query(`
                INSERT INTO Sforim 
                (HebTitle, RabbiID, HebAuthor, YearPublished, HebReference)
                VALUES 
                (@HebTitle, @RabbiID, @HebAuthor, @YearPublished, @HebReference);
                SELECT SCOPE_IDENTITY() AS SeferID;
            `);

            return result.recordset[0].SeferID;
        } catch (error) {
            console.error('Create book failed:', error);
            throw error;
        }
    }

    async createEvent(event) {
        try {
            await this.connect();
            const request = new sql.Request(this.pool);
            
            request.input('RabbiID', sql.Int, event.RabbiID);
            request.input('EventYear', sql.Int, event.EventYear || null);
            request.input('HebEventDescription', sql.NVarChar(sql.MAX), event.HebEventDescription);

            const result = await request.query(`
                INSERT INTO [Events and facts] 
                (RabbiID, EventYear, HebEventDescription)
                VALUES 
                (@RabbiID, @EventYear, @HebEventDescription);
                SELECT SCOPE_IDENTITY() AS EventID;
            `);

            return result.recordset[0].EventID;
        } catch (error) {
            console.error('Create event failed:', error);
            throw error;
        }
    }
}

const dbInstance = new DatabaseConnection();

// Export the instance and also sql for use in server.js
module.exports = dbInstance;
module.exports.sql = sql;
module.exports.poolPromise = dbInstance.connect();