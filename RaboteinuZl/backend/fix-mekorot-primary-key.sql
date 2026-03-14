-- Fix: Add primary key to Mekorot table
-- Run this BEFORE step 2
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Adding primary key to Mekorot table...';

-- Add primary key constraint to Mekorot.id
ALTER TABLE Mekorot
ADD CONSTRAINT PK_Mekorot PRIMARY KEY (id);

PRINT 'Primary key added successfully!';
PRINT 'Now you can run migrate-all-tables-step2-create-translations.sql';

-- Verify
SELECT 
    CONSTRAINT_NAME, 
    CONSTRAINT_TYPE 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'Mekorot';
