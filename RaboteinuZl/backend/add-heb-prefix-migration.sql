-- Migration: Add Heb prefix to language-specific text fields
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

-- Rename text fields to have Heb prefix
EXEC sp_rename 'Talmidei_Hahamim.FullName', 'HebFullName', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.knownAs', 'HebKnownAs', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.City', 'HebCity', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.Country', 'HebCountry', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.Period', 'HebPeriod', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.PlaceOfBirth', 'HebPlaceOfBirth', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.PlaceOfPtira', 'HebPlaceOfPtira', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.KnownFor', 'HebKnownFor', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.URL', 'HebURL', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.Notes', 'HebNotes', 'COLUMN';
EXEC sp_rename 'Talmidei_Hahamim.Sources', 'HebSources', 'COLUMN';

-- Keep these WITHOUT Heb prefix (language-agnostic):
-- RabbiID, YearOfBirth, YearOfDeath, ImageUrl
-- HebDob, HebDoP (already have Heb prefix)
-- Assumed, id

GO

-- Verify changes
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'Talmidei_Hahamim'
ORDER BY ORDINAL_POSITION;
