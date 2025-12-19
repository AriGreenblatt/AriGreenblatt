-- Create Family and Relationships tables for Hazal database
USE Hazal;
GO

-- Drop tables if they exist (in correct order due to foreign keys)
IF OBJECT_ID('dbo.Family', 'U') IS NOT NULL
    DROP TABLE dbo.Family;
GO

IF OBJECT_ID('dbo.Relationships', 'U') IS NOT NULL
    DROP TABLE dbo.Relationships;
GO

-- Create Relationships lookup table
CREATE TABLE dbo.Relationships (
    RelationshipCode INT PRIMARY KEY,
    RelationshipName NVARCHAR(50) NOT NULL
);
GO

-- Insert common relationship types
INSERT INTO dbo.Relationships (RelationshipCode, RelationshipName) VALUES
(1, N'אב'),           -- Father
(2, N'אם'),           -- Mother
(3, N'בן'),           -- Son
(4, N'בת'),           -- Daughter
(5, N'אח'),           -- Brother
(6, N'אחות'),         -- Sister
(7, N'סב'),           -- Grandfather
(8, N'סבתא'),         -- Grandmother
(9, N'נכד'),          -- Grandson
(10, N'נכדה'),        -- Granddaughter
(11, N'דוד'),         -- Uncle
(12, N'דודה'),        -- Aunt
(13, N'חתן'),         -- Son-in-law
(14, N'כלה'),         -- Daughter-in-law
(15, N'חמיו'),        -- Father-in-law
(16, N'חמות'),        -- Mother-in-law
(17, N'גיס'),         -- Brother-in-law
(18, N'גיסה');        -- Sister-in-law
GO

-- Create Family table
CREATE TABLE dbo.Family (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    Talmid_HahamID INT NOT NULL,
    RelativeID INT NULL,
    RelationshipCode INT NOT NULL,
    Name NVARCHAR(30) NULL,
    YearOfBirth INT NULL,
    YearOfDeath INT NULL,
    Notes NVARCHAR(MAX) NULL,
    CONSTRAINT FK_Family_TalmidHaham FOREIGN KEY (Talmid_HahamID) 
        REFERENCES dbo.Talmidei_Hahamim(RabbiID),
    CONSTRAINT FK_Family_Relative FOREIGN KEY (RelativeID) 
        REFERENCES dbo.Talmidei_Hahamim(RabbiID),
    CONSTRAINT FK_Family_Relationship FOREIGN KEY (RelationshipCode) 
        REFERENCES dbo.Relationships(RelationshipCode)
);
GO

-- Create indexes for better performance
CREATE INDEX IX_Family_TalmidHahamID ON dbo.Family(Talmid_HahamID);
CREATE INDEX IX_Family_RelativeID ON dbo.Family(RelativeID);
CREATE INDEX IX_Family_RelationshipCode ON dbo.Family(RelationshipCode);
GO

PRINT 'Family and Relationships tables created successfully';
