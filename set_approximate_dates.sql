-- Mark dates as approximate for medieval rabbis where exact dates are uncertain
-- Setting Approx = 1 for rabbis where we have estimated/approximate dates

PRINT 'Marking approximate dates for famous medieval rabbis...';

-- Mark the 8 famous rabbis we added with researched but approximate dates
UPDATE dbo.Talmidei_Hahamim 
SET Approx = 1
WHERE RabbiID IN (10193, 10207, 10238, 10268, 10269, 10299, 10398, 10501);
PRINT 'Marked 8 famous rabbis with approximate dates';

-- Mark all rabbis from before 1200 CE as approximate (medieval period with less precise records)
UPDATE dbo.Talmidei_Hahamim 
SET Approx = 1
WHERE YearOfBirth < 1200 AND Approx IS NULL;
PRINT 'Marked pre-1200 CE rabbis as approximate';

-- Mark Tannaim and early Amoraim (very ancient, dates are estimates)
UPDATE dbo.Talmidei_Hahamim 
SET Approx = 1
WHERE YearOfBirth < 600 AND Approx IS NULL;
PRINT 'Marked ancient Tannaim/Amoraim as approximate';

-- Mark rabbis with round-number birth/death years as likely approximate
UPDATE dbo.Talmidei_Hahamim 
SET Approx = 1
WHERE (YearOfBirth % 10 = 0 OR YearOfDeath % 10 = 0) 
  AND YearOfBirth < 1500 
  AND Approx IS NULL;
PRINT 'Marked round-number medieval dates as approximate';

-- Set remaining NULL Approx values to 0 (meaning dates are more precise)
UPDATE dbo.Talmidei_Hahamim 
SET Approx = 0
WHERE Approx IS NULL;
PRINT 'Set remaining dates as non-approximate';

PRINT '';
PRINT '=== Summary ===';
SELECT 
    COUNT(CASE WHEN Approx = 1 THEN 1 END) AS ApproximateDates,
    COUNT(CASE WHEN Approx = 0 THEN 1 END) AS PreciseDates,
    COUNT(*) AS TotalRabbis
FROM dbo.Talmidei_Hahamim;
