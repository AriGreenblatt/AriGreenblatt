alter table talmidei_hahamim
add knownAs char(15) not null default ((''))

UPDATE Talmidei_Hahamim SET KnownAS = N'אור זרוע' WHERE RabbiID = 268;
UPDATE Talmidei_Hahamim SET KnownAS = N'בעל העיטור' WHERE RabbiID = 60;
UPDATE Talmidei_Hahamim SET KnownAS = N'בעל המאור' WHERE RabbiID = 59;
UPDATE Talmidei_Hahamim SET KnownAS = N'הכוזרי' WHERE RabbiID = 51;
UPDATE Talmidei_Hahamim SET KnownAS = N'המאירי' WHERE RabbiID = 218;
UPDATE Talmidei_Hahamim SET KnownAS = N'המאירי' WHERE RabbiID = 11;
UPDATE Talmidei_Hahamim SET KnownAS = N'העיתים' WHERE RabbiID = 55;
UPDATE Talmidei_Hahamim SET KnownAS = N'ר"י מיגאש' WHERE RabbiID = 52;
UPDATE Talmidei_Hahamim SET KnownAS = N'ר״י מלוניל' WHERE RabbiID = 50;
UPDATE Talmidei_Hahamim SET KnownAS = N'הר״ן' WHERE RabbiID = 510;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרא"ה' WHERE RabbiID = 602;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרא״ש' WHERE RabbiID = 260;
UPDATE Talmidei_Hahamim SET KnownAS = N'הראב״ד הראשון' WHERE RabbiID = 56;
UPDATE Talmidei_Hahamim SET KnownAS = N'הראב״ד השלישי' WHERE RabbiID = 49;
UPDATE Talmidei_Hahamim SET KnownAS = N'הראב״ד השני' WHERE RabbiID = 57;
UPDATE Talmidei_Hahamim SET KnownAS = N'הראב״ן' WHERE RabbiID = 47;
UPDATE Talmidei_Hahamim SET KnownAS = N'הראב״ן' WHERE RabbiID = 67;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרוקח' WHERE RabbiID = 48;
UPDATE Talmidei_Hahamim SET KnownAS = N'הריב"ם' WHERE RabbiID = 44;
UPDATE Talmidei_Hahamim SET KnownAS = N'הריב״ש' WHERE RabbiID = 511;
UPDATE Talmidei_Hahamim SET KnownAS = N'הריב״ש' WHERE RabbiID = 300;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרלב"ג' WHERE RabbiID = 604;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרמב״ם' WHERE RabbiID = 53;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרמב״ן' WHERE RabbiID = 54;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרשב״א' WHERE RabbiID = 500;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרשב״ע' WHERE RabbiID = 348;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרשב״ץ' WHERE RabbiID = 298;
UPDATE Talmidei_Hahamim SET KnownAS = N'הרשב״ש' WHERE RabbiID = 299;
UPDATE Talmidei_Hahamim SET KnownAS = N'מהר״ם כ״ץ' WHERE RabbiID = 613;
UPDATE Talmidei_Hahamim SET KnownAS = N'מהר״ם מרוטנבורג' WHERE RabbiID = 259;
UPDATE Talmidei_Hahamim SET KnownAS = N'מלתמידי רש"י' WHERE RabbiID = 65;
UPDATE Talmidei_Hahamim SET KnownAS = N'ר״י הזקן' WHERE RabbiID = 46;
UPDATE Talmidei_Hahamim SET KnownAS = N'ראב"יה' WHERE RabbiID = 258;
UPDATE Talmidei_Hahamim SET KnownAS = N'רבנו תן' WHERE RabbiID = 45;
UPDATE Talmidei_Hahamim SET KnownAS = N'רש"י' WHERE RabbiID = 9;
UPDATE Talmidei_Hahamim SET KnownAS = N'רש״י' WHERE RabbiID = 61;
UPDATE Talmidei_Hahamim SET KnownAS = N'רשב"ם' WHERE RabbiID = 43;
UPDATE Talmidei_Hahamim SET KnownAS = N'רשב"ם הקטן' WHERE RabbiID = 66;

select * from Talmidei_Hahamim

ALTER TABLE Talmidei_Hahamim
ADD ImageUrl NVARCHAR(MAX) NULL default ((''));

UPDATE Talmidei_Hahamim
SET ImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Rashi.jpg'
WHERE FullName = 'רש"י' OR knownAs LIKE '%רש"י%';

select * from Talmidei_Hahamim
where ImageUrl = 'https://upload.wikimedia.org/wikipedia/commons/7/7d/Rashi.jpg'

UPDATE Talmidei_Hahamim
SET ImageUrl = '/img/rashi.jpg'
WHERE FullName = 'רש"י' OR knownAs LIKE '%רש"י%';

select * from Talmidei_Hahamim