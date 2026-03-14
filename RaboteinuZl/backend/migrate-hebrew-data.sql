-- Step 3: Migrate existing Hebrew data to translation table
-- Prerequisites: Run create-translation-tables.sql first
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

-- Migrate all existing Hebrew data from Heb prefixed columns to translation table
INSERT INTO Talmidei_Hahamim_Translations 
(RabbiID, LanguageCode, FullName, KnownAs, City, Country, Period, 
 PlaceOfBirth, PlaceOfPtira, KnownFor, Notes, Sources, URL)
SELECT 
    RabbiID,
    'he' as LanguageCode,
    HebFullName,
    HebKnownAs,
    HebCity,
    HebCountry,
    HebPeriod,
    HebPlaceOfBirth,
    HebPlaceOfPtira,
    HebKnownFor,
    HebNotes,
    HebSources,
    HebURL
FROM Talmidei_Hahamim
WHERE RabbiID IS NOT NULL;

GO

-- Verify migration
SELECT 
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN FullName IS NOT NULL THEN 1 END) as WithFullName,
    COUNT(CASE WHEN URL IS NOT NULL THEN 1 END) as WithURL
FROM Talmidei_Hahamim_Translations
GROUP BY LanguageCode;

-- Show sample data
SELECT TOP 5 
    t.RabbiID,
    tr.LanguageCode,
    tr.FullName,
    tr.KnownAs,
    tr.PlaceOfBirth
FROM Talmidei_Hahamim t
INNER JOIN Talmidei_Hahamim_Translations tr ON t.RabbiID = tr.RabbiID
ORDER BY t.RabbiID;

PRINT 'Migration complete! Hebrew data is now in Talmidei_Hahamim_Translations table.';
PRINT 'DO NOT drop the Heb columns yet - keep them as backup until testing is complete.';
