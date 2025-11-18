drop table Talmidei_Hahamim

CREATE TABLE Talmidei_Hahamim (
    RabbiID INT IDENTITY(1,1) PRIMARY KEY,
    FullName NVARCHAR(200) NOT NULL,
    HebrewName NVARCHAR(200) NULL,
    City NVARCHAR(100) NULL,
    Country NVARCHAR(100) NULL,
    Period NVARCHAR(100) NULL,
    YearOfBirth INT NULL,
    YearOfDeath INT NULL,
    KnownFor NVARCHAR(MAX) NULL,
    Notes NVARCHAR(MAX) NULL,
    Sources NVARCHAR(MAX) NULL
);

alter TABLE Talmidei_Hahamim 
 add PlaceOfBirth NVARCHAR(30) not null ,
     PlaceOfPtira NVARCHAR(30) not null

CREATE TABLE Talmidim (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    RabbiID INT NOT NULL,
    TeacherID INT NOT NULL,
    FromYear INT NULL,
    ToYear INT NULL,
    Place NVARCHAR(255) NULL,
    Notes NVARCHAR(MAX) NULL,
    FOREIGN KEY (RabbiID) REFERENCES Talmidei_Hahamim(RabbiID),
    FOREIGN KEY (TeacherID) REFERENCES Talmidei_Hahamim(RabbiID)
);


CREATE TABLE TeachersStudents (
    RelationID INT IDENTITY(1,1) PRIMARY KEY,
    TeacherID INT FOREIGN KEY REFERENCES Talmidei_Hahamim(RabbiID),
    StudentID INT FOREIGN KEY REFERENCES Talmidei_Hahamim(RabbiID)
);

CREATE TABLE Sforim (
    SeferID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(300),
    RabbiID INT FOREIGN KEY REFERENCES Talmidei_Hahamim(RabbiID),
    Author NVARCHAR(200),
    YearPublished INT NULL,
    Reference NVARCHAR(MAX)
)

CREATE UNIQUE INDEX IX_Talmidei_Hahamim_FullName
ON Talmidei_Hahamim (FullName);

CREATE TABLE Events (
    EventID INT IDENTITY(1,1) PRIMARY KEY,
    RabbiID INT NOT NULL FOREIGN KEY REFERENCES Talmidei_Hahamim(RabbiID),
    EventYear INT NULL,
    EventDescription NVARCHAR(MAX) NOT NULL
);

CREATE TABLE EventParticipants (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    EventID INT FOREIGN KEY REFERENCES Events(EventID),
    RabbiID INT FOREIGN KEY REFERENCES Talmidei_Hahamim(RabbiID)
);



