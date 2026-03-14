-- Step 1: Add Heb prefix to all text fields in remaining tables
-- Run this in SSMS on the Hazal database
-- This prepares existing data for migration to translation tables

USE Hazal;
GO

PRINT 'Starting rename operations for all tables...';
GO

-- ============================================
-- AssociatedWith Table
-- ============================================
PRINT 'Renaming AssociatedWith fields...';

EXEC sp_rename 'AssociatedWith.Place', 'HebPlace', 'COLUMN';
EXEC sp_rename 'AssociatedWith.Notes', 'HebNotes', 'COLUMN';

-- Keep: ID, FromYear, ToYear, FamilyCode, RabbiId, Rabbi2Id, RelationshipCode, IsApprox
GO

-- ============================================
-- Sforim Table
-- ============================================
PRINT 'Renaming Sforim fields...';

EXEC sp_rename 'Sforim.Title', 'HebTitle', 'COLUMN';
EXEC sp_rename 'Sforim.Author', 'HebAuthor', 'COLUMN';
EXEC sp_rename 'Sforim.Reference', 'HebReference', 'COLUMN';

-- Keep: SeferID, RabbiID, YearPublished
GO

-- ============================================
-- Relationships Table (Lookup)
-- ============================================
PRINT 'Renaming Relationships fields...';

EXEC sp_rename 'Relationships.RelationshipName', 'HebRelationshipName', 'COLUMN';

-- Keep: RelationshipCode
GO

-- ============================================
-- Events Table
-- ============================================
PRINT 'Renaming Events fields...';

EXEC sp_rename 'Events.EventDescription', 'HebEventDescription', 'COLUMN';

-- Keep: EventID, RabbiID, EventYear
GO

-- ============================================
-- Mekorot Table
-- ============================================
PRINT 'Renaming Mekorot fields...';

EXEC sp_rename 'Mekorot.name', 'HebName', 'COLUMN';

-- Keep: id
GO

PRINT 'All rename operations complete!';
PRINT '';
PRINT 'Verification - Check renamed columns:';

SELECT TABLE_NAME, COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME IN ('AssociatedWith', 'Sforim', 'Relationships', 'Events', 'Mekorot')
  AND COLUMN_NAME LIKE 'Heb%'
ORDER BY TABLE_NAME, COLUMN_NAME;
