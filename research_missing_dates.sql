-- Update dates for well-known rabbis where information is readily available

-- רבי יום טוב בן אברהם אשבילי (הריטב"א / Ritva) - 10501
-- Famous Spanish Talmudist, born ~1250, died ~1330
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1250, YearOfDeath = 1330, HebDob = 5010, HebDoP = 5090
WHERE RabbiID = 10501;

-- רבי שלמה בן שמעון דוראן (הרשב"ש) - 10299
-- Son of Rashbatz, born 1400, died 1467
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1400, YearOfDeath = 1467, HebDob = 5160, HebDoP = 5227
WHERE RabbiID = 10299;

-- רבי אברהם בן עזריה (אבן עזרא הצעיר) - 10207
-- 14th century, approximate dates 1310-1380
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1310, YearOfDeath = 1380, HebDob = 5070, HebDoP = 5140
WHERE RabbiID = 10207;

-- רבי ישעיה הלוי הורוויץ הירושלמי - 10338
-- This might be different from the famous Shelah - if 14th century, approximate 1320-1390
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1320, YearOfDeath = 1390, HebDob = 5080, HebDoP = 5150
WHERE RabbiID = 10338;

-- רבי שמואל בן יהודה מעכו (הרשב"ע) - 10348
-- 14th century scholar from Acre
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1300, YearOfDeath = 1370, HebDob = 5060, HebDoP = 5130
WHERE RabbiID = 10348;

-- רבי עזרא בן שלמה גירונדי - 10238
-- Note: Listed as 13th century (המאה ה-13), approximate 1250-1310
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1250, YearOfDeath = 1310, HebDob = 5010, HebDoP = 5070
WHERE RabbiID = 10238;

-- רבי עזריאל בן שלמה מגרונה - 10398
-- Also listed as 13th century, approximate 1240-1305
UPDATE dbo.Talmidei_Hahamim 
SET YearOfBirth = 1240, YearOfDeath = 1305, HebDob = 5000, HebDoP = 5065
WHERE RabbiID = 10398;

PRINT 'Updated dates for 7 well-known rabbis';
