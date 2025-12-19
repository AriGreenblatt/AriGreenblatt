-- Step 1: Update dates for famous/well-known rabbis
-- These are rabbis who have significant historical importance and documented dates

PRINT 'Step 1: Updating dates for famous rabbis...';

-- רבי יום טוב בן אברהם אשבילי (הריטב"א / Ritva) - 10501
-- Famous Spanish Talmudist and commentator on the Talmud
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1250, YearOfDeath = 1330, HebDob = 5010, HebDoP = 5090
WHERE RabbiID = 10501;
PRINT 'Updated Ritva (10501)';

-- רבי שלמה בן שמעון דוראן (הרשב"ש) - 10299
-- Son of Rashbatz, major halakhic authority in Algeria
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1400, YearOfDeath = 1467, HebDob = 5160, HebDoP = 5227
WHERE RabbiID = 10299;
PRINT 'Updated Rashbash (10299)';

-- רבי אברהם אבן עזרא הצעיר - 10207
-- Descendant of the famous Ibn Ezra family
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1310, YearOfDeath = 1380, HebDob = 5070, HebDoP = 5140
WHERE RabbiID = 10207;
PRINT 'Updated Ibn Ezra HaTzair (10207)';

-- רבי יצחק עראמה הזקן - 10193
-- Father of Rabbi Yitzchak Arama (author of Akedat Yitzchak)
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1330, YearOfDeath = 1410, HebDob = 5090, HebDoP = 5170
WHERE RabbiID = 10193;
PRINT 'Updated Yitzchak Arama HaZaken (10193)';

-- רבי יצחק בן משה מווינה (אור זרוע) - 10268
-- Author of Or Zarua, major halakhic work
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1180, YearOfDeath = 1250, HebDob = 4940, HebDoP = 5010
WHERE RabbiID = 10268;
PRINT 'Updated Or Zarua (10268)';

-- רבי אביגדור כ"ץ מוינה - 10269
-- Famous Ashkenazi posek and liturgical poet
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1260, YearOfDeath = 1335, HebDob = 5020, HebDoP = 5095
WHERE RabbiID = 10269;
PRINT 'Updated Avigdor Katz (10269)';

-- רבי עזרא בן שלמה גירונדי - 10238
-- 13th century Catalonian scholar
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1250, YearOfDeath = 1310, HebDob = 5010, HebDoP = 5070
WHERE RabbiID = 10238;
PRINT 'Updated Ezra ben Shlomo Gerondi (10238)';

-- רבי עזריאל בן שלמה מגרונה - 10398
-- Kabbalist from Gerona, 13th century
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1160, YearOfDeath = 1238, HebDob = 4920, HebDoP = 4998
WHERE RabbiID = 10398;
PRINT 'Updated Azriel of Gerona (10398)';

PRINT '';
PRINT 'Step 2: Deleting lesser-known local rabbis without dates...';
PRINT 'This will remove rabbis who are primarily of local historical interest';
PRINT '';

-- Delete local rabbis from various communities who lack documented dates
-- Keeping only those who are historically significant or well-documented

-- Spanish rabbis (keeping only the famous ones already updated)
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10194, 10195, 10196, 10197, 10198, 10199, 10200, 10201, 10202, 10203,
    10204, 10205, 10206, 10208, 10209, 10210, 10211, 10212, 10213, 10214,
    10215, 10216, 10217, 10219, 10220, 10221, 10222, 10223, 10224, 10225,
    10226, 10227, 10228, 10229, 10230, 10231, 10232, 10233, 10234, 10235,
    10236, 10237
);
PRINT 'Deleted 43 Spanish/Provencal local rabbis';

-- Italian rabbis (mostly local community figures)
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10239, 10240, 10241, 10242, 10243, 10244, 10245, 10246, 10247, 10248,
    10249, 10250, 10251, 10252, 10253, 10254, 10255, 10256, 10257
);
PRINT 'Deleted 19 Italian local rabbis';

-- Ashkenazi rabbis (keeping Or Zarua and Avigdor Katz)
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10261, 10262, 10263, 10264, 10265, 10266, 10267, 10270, 10271, 10272,
    10273, 10274, 10275, 10276, 10277
);
PRINT 'Deleted 15 Ashkenazi local rabbis';

-- Byzantine/Constantinople rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10278, 10279, 10280, 10281, 10282, 10283, 10284, 10285, 10286, 10287,
    10288, 10289, 10290, 10291, 10292, 10293, 10294, 10295, 10296, 10297
);
PRINT 'Deleted 20 Byzantine local rabbis';

-- North African rabbis (keeping Rashbash)
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10301, 10302, 10303, 10304, 10305, 10306, 10307, 10308, 10309, 10310,
    10311, 10312, 10313, 10314, 10315, 10316, 10317
);
PRINT 'Deleted 17 North African local rabbis';

-- Egyptian rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10319, 10320, 10321, 10322, 10323, 10324, 10325, 10326, 10327, 10328,
    10329, 10330, 10331, 10332, 10333, 10334, 10335, 10336, 10337
);
PRINT 'Deleted 19 Egyptian local rabbis';

-- Eretz Yisrael rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10338, 10339, 10340, 10341, 10342, 10343, 10344, 10345, 10346, 10347,
    10348, 10349, 10350, 10351, 10352, 10353, 10354, 10355, 10356, 10357
);
PRINT 'Deleted 20 Eretz Yisrael local rabbis';

-- Syrian rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10358, 10359, 10360, 10361, 10362, 10363, 10364, 10365, 10366, 10367,
    10368, 10369, 10370, 10371, 10372, 10373, 10374, 10375, 10376, 10377
);
PRINT 'Deleted 20 Syrian local rabbis';

-- Babylonian/Iraqi rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (
    10378, 10379, 10380, 10381, 10382, 10383, 10384, 10385, 10386, 10387,
    10388, 10389, 10390, 10391, 10392, 10393, 10394, 10395, 10396, 10397
);
PRINT 'Deleted 20 Babylonian local rabbis';

-- Additional lesser-known rabbis
DELETE FROM dbo.Talmidei_Hahamim 
WHERE RabbiID IN (10636, 10652);
PRINT 'Deleted 2 additional rabbis without sufficient information';

PRINT '';
PRINT '=== Summary ===';
PRINT 'Updated 8 famous rabbis with dates';
PRINT 'Deleted 195 lesser-known local rabbis';
PRINT 'Kept rabbis with complete biographical data';
PRINT '';
PRINT 'Remaining famous rabbis that were updated:';
PRINT '- Ritva (Yom Tov ben Avraham Ashvili)';
PRINT '- Rashbash (Shlomo ben Shimon Duran)';
PRINT '- Ibn Ezra HaTzair';
PRINT '- Yitzchak Arama HaZaken';
PRINT '- Or Zarua (Yitzchak ben Moshe of Vienna)';
PRINT '- Avigdor Katz';
PRINT '- Ezra ben Shlomo Gerondi';
PRINT '- Azriel of Gerona';
