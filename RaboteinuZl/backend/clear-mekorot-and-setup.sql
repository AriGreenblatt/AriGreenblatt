-- Clear Mekorot table and add primary key
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Clearing Mekorot table (data is negligible)...';

-- Delete all records
DELETE FROM Mekorot;

PRINT 'Mekorot table cleared.';
GO

-- Add primary key
PRINT 'Adding primary key to Mekorot...';

ALTER TABLE Mekorot
ADD CONSTRAINT PK_Mekorot PRIMARY KEY (id);

PRINT 'Primary key added successfully!';
GO

-- Drop existing Mekorot_Translations if it exists
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

PRINT '';
PRINT '=== COMPLETE ===';
PRINT 'Mekorot table ready for multi-language data entry.';
PRINT 'All translation tables now exist.';

-- Verify all translation tables
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME LIKE '%_Translations'
ORDER BY TABLE_NAME;
