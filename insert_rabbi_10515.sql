-- Insert RabbiID 10515 with URL in correct column
SET IDENTITY_INSERT dbo.Talmidei_Hahamim ON;

INSERT INTO dbo.Talmidei_Hahamim 
    (RabbiID, FullName, City, Country, Period, YearOfBirth, YearOfDeath, 
     KnownFor, Notes, Sources, PlaceOfBirth, PlaceOfPtira, knownAs, ImageUrl, YoBHebrew, YoPHebrew, URL)
VALUES 
    (10515, N'רבי יצחק סגי נהור', N'ווה', N'צרפת', N'המאה ה-13', 1160, 1235,
     N'מקובל', N'בנו של הראב"ד', N'', N'', N'', N'ריס"ן', '/img/YitzhakSagiNahor.jpg', N'', N'', 
     N'https://he.wikipedia.org/wiki/%D7%99%D7%A6%D7%97%D7%A7_%D7%A1%D7%92%D7%99_%D7%A0%D7%94%D7%95%D7%A8');

SET IDENTITY_INSERT dbo.Talmidei_Hahamim OFF;
