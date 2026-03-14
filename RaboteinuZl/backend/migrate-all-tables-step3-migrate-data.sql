-- Step 3: Migrate existing Hebrew data to translation tables
-- Prerequisites: Run step1 and step2 scripts first
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Starting data migration to translation tables...';
GO

-- ============================================
-- Migrate AssociatedWith data
-- ============================================
PRINT 'Migrating AssociatedWith data...';

INSERT INTO AssociatedWith_Translations (AssociationID, LanguageCode, Place, Notes)
SELECT 
    ID,
    'he' as LanguageCode,
    HebPlace,
    HebNotes
FROM AssociatedWith
WHERE ID IS NOT NULL;

DECLARE @AssocCount INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@AssocCount AS VARCHAR) + ' AssociatedWith records';
GO

-- ============================================
-- Migrate Sforim data
-- ============================================
PRINT 'Migrating Sforim data...';

INSERT INTO Sforim_Translations (SeferID, LanguageCode, Title, Author, Reference)
SELECT 
    SeferID,
    'he' as LanguageCode,
    HebTitle,
    HebAuthor,
    HebReference
FROM Sforim
WHERE SeferID IS NOT NULL;

DECLARE @SforimCount INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@SforimCount AS VARCHAR) + ' Sforim records';
GO

-- ============================================
-- Migrate Relationships data
-- ============================================
PRINT 'Migrating Relationships data...';

INSERT INTO Relationships_Translations (RelationshipCode, LanguageCode, RelationshipName)
SELECT 
    RelationshipCode,
    'he' as LanguageCode,
    HebRelationshipName
FROM Relationships
WHERE RelationshipCode IS NOT NULL;

DECLARE @RelCount INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@RelCount AS VARCHAR) + ' Relationships records';
GO

-- ============================================
-- Migrate Events data
-- ============================================
PRINT 'Migrating Events data...';

INSERT INTO Events_Translations (EventID, LanguageCode, EventDescription)
SELECT 
    EventID,
    'he' as LanguageCode,
    HebEventDescription
FROM Events
WHERE EventID IS NOT NULL;

DECLARE @EventsCount INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@EventsCount AS VARCHAR) + ' Events records';
GO

-- ============================================
-- Migrate Mekorot data
-- ============================================
PRINT 'Migrating Mekorot data...';

INSERT INTO Mekorot_Translations (MakorID, LanguageCode, Name)
SELECT 
    id,
    'he' as LanguageCode,
    HebName
FROM Mekorot
WHERE id IS NOT NULL;

DECLARE @MekorotCount INT = @@ROWCOUNT;
PRINT 'Migrated ' + CAST(@MekorotCount AS VARCHAR) + ' Mekorot records';
GO

-- ============================================
-- Verification queries
-- ============================================
PRINT '';
PRINT '=== MIGRATION VERIFICATION ===';
PRINT '';

-- Check all translation tables
SELECT 
    'AssociatedWith' as TableName,
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN Place IS NOT NULL THEN 1 END) as WithPlace,
    COUNT(CASE WHEN Notes IS NOT NULL THEN 1 END) as WithNotes
FROM AssociatedWith_Translations
GROUP BY LanguageCode

UNION ALL

SELECT 
    'Sforim' as TableName,
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN Title IS NOT NULL THEN 1 END) as WithTitle,
    COUNT(CASE WHEN Author IS NOT NULL THEN 1 END) as WithAuthor
FROM Sforim_Translations
GROUP BY LanguageCode

UNION ALL

SELECT 
    'Relationships' as TableName,
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN RelationshipName IS NOT NULL THEN 1 END) as WithName,
    NULL as Extra
FROM Relationships_Translations
GROUP BY LanguageCode

UNION ALL

SELECT 
    'Events' as TableName,
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN EventDescription IS NOT NULL THEN 1 END) as WithDescription,
    NULL as Extra
FROM Events_Translations
GROUP BY LanguageCode

UNION ALL

SELECT 
    'Mekorot' as TableName,
    COUNT(*) as TotalTranslations,
    LanguageCode,
    COUNT(CASE WHEN Name IS NOT NULL THEN 1 END) as WithName,
    NULL as Extra
FROM Mekorot_Translations
GROUP BY LanguageCode;

PRINT '';
PRINT '=== SAMPLE DATA ===';
PRINT '';

-- Show sample records from each table
PRINT 'AssociatedWith samples:';
SELECT TOP 3 a.ID, tr.LanguageCode, tr.Place, LEFT(tr.Notes, 50) as NotesPreview
FROM AssociatedWith a
INNER JOIN AssociatedWith_Translations tr ON a.ID = tr.AssociationID
ORDER BY a.ID;

PRINT '';
PRINT 'Sforim samples:';
SELECT TOP 3 s.SeferID, tr.LanguageCode, tr.Title, tr.Author
FROM Sforim s
INNER JOIN Sforim_Translations tr ON s.SeferID = tr.SeferID
ORDER BY s.SeferID;

PRINT '';
PRINT 'Relationships samples:';
SELECT r.RelationshipCode, tr.LanguageCode, tr.RelationshipName
FROM Relationships r
INNER JOIN Relationships_Translations tr ON r.RelationshipCode = tr.RelationshipCode
ORDER BY r.RelationshipCode;

PRINT '';
PRINT 'Events samples:';
SELECT TOP 3 e.EventID, tr.LanguageCode, LEFT(tr.EventDescription, 50) as DescriptionPreview
FROM Events e
INNER JOIN Events_Translations tr ON e.EventID = tr.EventID
ORDER BY e.EventID;

PRINT '';
PRINT 'Mekorot samples:';
SELECT TOP 5 m.id, tr.LanguageCode, tr.Name
FROM Mekorot m
INNER JOIN Mekorot_Translations tr ON m.id = tr.MakorID
ORDER BY m.id;

PRINT '';
PRINT '=== MIGRATION COMPLETE ===';
PRINT 'All Hebrew data successfully migrated to translation tables.';
PRINT 'DO NOT drop the Heb columns yet - keep them as backup until full testing is complete.';
PRINT '';
PRINT 'Next steps:';
PRINT '1. Test reading data from translation tables';
PRINT '2. Update backend code to use new structure';
PRINT '3. Test inserting new records';
PRINT '4. After confirming everything works, optionally drop Heb columns';
