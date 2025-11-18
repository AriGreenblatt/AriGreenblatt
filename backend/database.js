const sql = require('mssql');
require('dotenv').config({ path: __dirname + '/.env' });

const config = {
    server: process.env.DB_SERVER || 'localhost\\SQLEXPRESS',
    database: process.env.DB_DATABASE || 'master',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 30000,
    requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT) || 30000,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
        enableArithAbort: true,
        useUTC: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
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
}

module.exports = new DatabaseConnection();