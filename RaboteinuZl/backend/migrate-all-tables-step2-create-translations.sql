-- Step 2: Create translation tables for all remaining tables
-- Prerequisites: Run migrate-all-tables-step1-rename.sql first
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Creating translation tables...';
GO

-- ============================================
-- AssociatedWith_Translations
-- ============================================
PRINT 'Creating AssociatedWith_Translations...';

CREATE TABLE AssociatedWith_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    AssociationID INT NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    Place NVARCHAR(255) NULL,
    Notes NVARCHAR(MAX) NULL,
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_AssociatedWith_Translation FOREIGN KEY (AssociationID) 
        REFERENCES AssociatedWith(ID) ON DELETE CASCADE,
    CONSTRAINT FK_AssociatedWith_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_AssociatedWith_Language UNIQUE (AssociationID, LanguageCode)
);

CREATE INDEX IX_AssociatedWith_Trans_ID ON AssociatedWith_Translations(AssociationID);
CREATE INDEX IX_AssociatedWith_Trans_Lang ON AssociatedWith_Translations(LanguageCode);
GO

-- ============================================
-- Sforim_Translations
-- ============================================
PRINT 'Creating Sforim_Translations...';

CREATE TABLE Sforim_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    SeferID INT NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    Title NVARCHAR(300) NULL,
    Author NVARCHAR(200) NULL,
    Reference NVARCHAR(MAX) NULL,
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_Sforim_Translation FOREIGN KEY (SeferID) 
        REFERENCES Sforim(SeferID) ON DELETE CASCADE,
    CONSTRAINT FK_Sforim_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_Sforim_Language UNIQUE (SeferID, LanguageCode)
);

CREATE INDEX IX_Sforim_Trans_ID ON Sforim_Translations(SeferID);
CREATE INDEX IX_Sforim_Trans_Lang ON Sforim_Translations(LanguageCode);
GO

-- ============================================
-- Relationships_Translations
-- ============================================
PRINT 'Creating Relationships_Translations...';

CREATE TABLE Relationships_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    RelationshipCode INT NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    RelationshipName NVARCHAR(50) NOT NULL,
    Description NVARCHAR(255) NULL,
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_Relationships_Translation FOREIGN KEY (RelationshipCode) 
        REFERENCES Relationships(RelationshipCode) ON DELETE CASCADE,
    CONSTRAINT FK_Relationships_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_Relationships_Language UNIQUE (RelationshipCode, LanguageCode)
);

CREATE INDEX IX_Relationships_Trans_Code ON Relationships_Translations(RelationshipCode);
CREATE INDEX IX_Relationships_Trans_Lang ON Relationships_Translations(LanguageCode);
GO

-- ============================================
-- Events_Translations
-- ============================================
PRINT 'Creating Events_Translations...';

CREATE TABLE Events_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    EventID INT NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    EventDescription NVARCHAR(MAX) NOT NULL,
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_Events_Translation FOREIGN KEY (EventID) 
        REFERENCES Events(EventID) ON DELETE CASCADE,
    CONSTRAINT FK_Events_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_Events_Language UNIQUE (EventID, LanguageCode)
);

CREATE INDEX IX_Events_Trans_ID ON Events_Translations(EventID);
CREATE INDEX IX_Events_Trans_Lang ON Events_Translations(LanguageCode);
GO

-- ============================================
-- Mekorot_Translations
-- ============================================
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
GO

PRINT 'All translation tables created successfully!';
PRINT '';
PRINT 'Summary of new tables:';

SELECT 
    TABLE_NAME,
    COUNT(*) as ColumnCount
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME LIKE '%_Translations'
  AND TABLE_NAME NOT IN ('Talmidei_Hahamim_Translations')
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;
