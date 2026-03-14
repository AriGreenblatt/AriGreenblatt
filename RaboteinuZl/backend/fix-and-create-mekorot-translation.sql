-- Fix Mekorot table and create its translation table
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Checking Mekorot table structure...';

-- Check for duplicate IDs in Mekorot
SELECT id, COUNT(*) as DuplicateCount
FROM Mekorot
GROUP BY id
HAVING COUNT(*) > 1;

-- If there are duplicates, you'll need to fix them first
-- For now, let's check if primary key exists

IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
           WHERE CONSTRAINT_NAME = 'PK_Mekorot' AND TABLE_NAME = 'Mekorot')
BEGIN
    PRINT 'Primary key already exists on Mekorot';
END
ELSE
BEGIN
    PRINT 'Adding primary key to Mekorot...';
    
    -- Check if there are any NULL values in id column
    IF EXISTS (SELECT 1 FROM Mekorot WHERE id IS NULL)
    BEGIN
        PRINT 'ERROR: NULL values found in Mekorot.id - cannot create primary key';
        PRINT 'Please clean data first';
    END
    ELSE
    BEGIN
        -- Try to add primary key
        ALTER TABLE Mekorot
        ADD CONSTRAINT PK_Mekorot PRIMARY KEY (id);
        PRINT 'Primary key added successfully!';
    END
END
GO

-- Drop existing Mekorot_Translations if it exists (partial creation)
IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Mekorot_Translations')
BEGIN
    PRINT 'Dropping existing Mekorot_Translations...';
    DROP TABLE Mekorot_Translations;
END
GO

-- Create Mekorot_Translations table
PRINT 'Creating Mekorot_Translations...';

CREATE TABLE Mekorot_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    MakorID VARCHAR(5) NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    Name VARCHAR(50) NOT NULL,
    FullName NVARCHAR(255) NULL,
    Description NVARCHAR(MAX) NULL,
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_Mekorot_Translation FOREIGN KEY (MakorID) 
        REFERENCES Mekorot(id) ON DELETE CASCADE,
    CONSTRAINT FK_Mekorot_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_Mekorot_Language UNIQUE (MakorID, LanguageCode)
);

CREATE INDEX IX_Mekorot_Trans_ID ON Mekorot_Translations(MakorID);
CREATE INDEX IX_Mekorot_Trans_Lang ON Mekorot_Translations(LanguageCode);

PRINT 'Mekorot_Translations created successfully!';
GO

-- Verify all translation tables now exist
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%_Translations'
ORDER BY TABLE_NAME;
