-- Step 1: Find and fix duplicate IDs in Mekorot table
-- Run this in SSMS on the Hazal database

USE Hazal;
GO

PRINT 'Checking for duplicate IDs in Mekorot...';
PRINT '';

-- Show all duplicates
SELECT id, COUNT(*) as DuplicateCount
FROM Mekorot
GROUP BY id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

PRINT '';
PRINT 'Detailed view of duplicate records:';

-- Show the actual duplicate records
SELECT * 
FROM Mekorot
WHERE id IN (
    SELECT id 
    FROM Mekorot 
    GROUP BY id 
    HAVING COUNT(*) > 1
)
ORDER BY id;

PRINT '';
PRINT '=== RECOMMENDED ACTIONS ===';
PRINT '';
PRINT '1. Review the duplicate records above';
PRINT '2. Decide which records to keep/delete/merge';
PRINT '3. Options:';
PRINT '   A) Delete all duplicates except the first one (automatic)';
PRINT '   B) Manually review and fix each duplicate';
PRINT '   C) Create new unique IDs for duplicates';
PRINT '';
PRINT 'To automatically remove duplicates (keeps first occurrence):';
PRINT '   Uncomment and run the DELETE section below';
PRINT '';

-- OPTION A: Automatic deletion (keeps first row, deletes rest)
-- UNCOMMENT THIS BLOCK AFTER REVIEWING DUPLICATES:
/*
WITH CTE AS (
    SELECT 
        id,
        HebName,
        ROW_NUMBER() OVER (PARTITION BY id ORDER BY (SELECT NULL)) as RowNum
    FROM Mekorot
)
DELETE FROM CTE WHERE RowNum > 1;

PRINT 'Duplicates removed!';
PRINT 'Re-run this script to verify no duplicates remain.';
*/
