-- Step 2: Create Multi-Language Translation Architecture
-- Prerequisites: Run add-heb-prefix-migration.sql first
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

-- Create Languages lookup table
CREATE TABLE Languages (
    LanguageCode NVARCHAR(10) PRIMARY KEY,
    LanguageName NVARCHAR(100) NOT NULL,
    NativeName NVARCHAR(100) NOT NULL,
    IsActive BIT NOT NULL DEFAULT 1,
    SortOrder INT NOT NULL DEFAULT 0
);

-- Insert supported languages
INSERT INTO Languages (LanguageCode, LanguageName, NativeName, IsActive, SortOrder) VALUES
('he', 'Hebrew', 'עברית', 1, 1),
('en', 'English', 'English', 1, 2),
('ru', 'Russian', 'Русский', 1, 3),
('fr', 'French', 'Français', 1, 4),
('es', 'Spanish', 'Español', 1, 5),
('ar', 'Arabic', 'العربية', 1, 6),
('yi', 'Yiddish', 'ייִדיש', 1, 7),
('zh', 'Chinese', '中文', 1, 8);

GO

-- Create Translation table for Talmidei_Hahamim
CREATE TABLE Talmidei_Hahamim_Translations (
    TranslationID INT IDENTITY(1,1) PRIMARY KEY,
    RabbiID INT NOT NULL,
    LanguageCode NVARCHAR(10) NOT NULL,
    
    -- Translated text fields
    FullName NVARCHAR(255) NULL,
    KnownAs NVARCHAR(255) NULL,
    City NVARCHAR(255) NULL,
    Country NVARCHAR(255) NULL,
    Period NVARCHAR(255) NULL,
    PlaceOfBirth NVARCHAR(255) NULL,
    PlaceOfPtira NVARCHAR(255) NULL,
    KnownFor NVARCHAR(MAX) NULL,
    Notes NVARCHAR(MAX) NULL,
    Sources NVARCHAR(MAX) NULL,
    URL NVARCHAR(500) NULL,  -- Wikipedia URL per language (he.wikipedia, en.wikipedia, etc.)
    
    -- Metadata
    CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),
    ModifiedDate DATETIME NOT NULL DEFAULT GETDATE(),
    
    -- Constraints
    CONSTRAINT FK_Translation_Rabbi FOREIGN KEY (RabbiID) 
        REFERENCES Talmidei_Hahamim(RabbiID) ON DELETE CASCADE,
    CONSTRAINT FK_Translation_Language FOREIGN KEY (LanguageCode) 
        REFERENCES Languages(LanguageCode),
    CONSTRAINT UQ_Rabbi_Language UNIQUE (RabbiID, LanguageCode)
);

-- Create indexes for performance
CREATE INDEX IX_Translation_RabbiID ON Talmidei_Hahamim_Translations(RabbiID);
CREATE INDEX IX_Translation_Language ON Talmidei_Hahamim_Translations(LanguageCode);

GO

-- Verify structure
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Talmidei_Hahamim_Translations'
ORDER BY ORDINAL_POSITION;

SELECT * FROM Languages;
