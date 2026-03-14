// Wikipedia data extraction utilities
const https = require('https');

// User agent for Wikipedia API requests
const USER_AGENT = 'RaboteinuZl/1.0 (https://github.com/GreenblattArie/Hazal; contact@example.com)';

/**
 * Convert Gregorian year to Hebrew year (numeric)
 * Hebrew year starts in fall (Tishrei), so we add 3761 for dates after September
 * For simplicity, we use 3760 as the standard conversion
 */
function gregorianToHebrewYear(gregorianYear) {
    if (!gregorianYear) return null;
    return gregorianYear + 3760;
}

/**
 * Convert Hebrew year number to Hebrew letters (gematria)
 * Returns abbreviated form like ה'תש"ן for 5750
 */
function hebrewYearToLetters(hebrewYear) {
    if (!hebrewYear) return '';
    
    const hebrewNumerals = {
        1: 'א', 2: 'ב', 3: 'ג', 4: 'ד', 5: 'ה', 6: 'ו', 7: 'ז', 8: 'ח', 9: 'ט',
        10: 'י', 20: 'כ', 30: 'ל', 40: 'מ', 50: 'נ', 60: 'ס', 70: 'ע', 80: 'פ', 90: 'צ',
        100: 'ק', 200: 'ר', 300: 'ש', 400: 'ת'
    };
    
    // For years 5000+, use abbreviated format: ה'תש"ן (5 thousand + remainder)
    if (hebrewYear >= 5000) {
        const thousands = Math.floor(hebrewYear / 1000);
        const remainder = hebrewYear % 1000;
        
        let result = hebrewNumerals[thousands] + "'";
        
        // Convert remainder to letters
        const hundreds = Math.floor(remainder / 100) * 100;
        const tens = Math.floor((remainder % 100) / 10) * 10;
        const ones = remainder % 10;
        
        if (hundreds > 0) result += hebrewNumerals[hundreds];
        
        // Special cases for 15 and 16 (avoid יה and יו which spell God's name)
        if (tens === 10 && ones === 5) {
            result += 'טו';
        } else if (tens === 10 && ones === 6) {
            result += 'טז';
        } else {
            if (tens > 0) result += hebrewNumerals[tens];
            if (ones > 0) result += hebrewNumerals[ones];
        }
        
        // Add gershayim (") before last letter for multi-letter numbers
        if (result.length > 2) {
            result = result.slice(0, -1) + '"' + result.slice(-1);
        }
        
        return result;
    }
    
    return '';
}

/**
 * Extract book names from text containing phrases like "כתב את", "ספר", "חיבור"
 */
function extractBooksFromText(text, html = '') {
    const books = [];
    if (!text) return books;
    
    try {
        // Simple patterns to find book mentions - using Unicode ranges for Hebrew
        const patterns = [
            /כתב את ה?חיבור\s+([\u0590-\u05FF\s"']+?)(?:\s+על|,|\.)/g,
            /מחבר\s+([\u0590-\u05FF\s"']+?)(?:\s+על|,|\.)/g,
            /בעל\s+([\u0590-\u05FF\s"']+?)(?:\s+על|,|\.)/g
        ];
        
        const foundBooks = new Set();
        
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                let bookName = match[1] ? match[1].trim() : '';
                
                // Clean up book name - remove common prefixes and trailing punctuation
                bookName = bookName
                    .replace(/^(ה|ב|כ|ל|מ|ש)+/, '')
                    .replace(/[,\.;:]+$/, '')
                    .trim();
                
                // Only add if it looks like a real book name
                if (bookName && bookName.length > 2 && !foundBooks.has(bookName)) {
                    foundBooks.add(bookName);
                    books.push({
                        HebTitle: bookName,
                        Title: '',
                        YearPublished: null,
                        Type: 'חיבור',
                        HebNotes: 'נמצא בטקסט ויקיפדיה',
                        Notes: 'Found in Wikipedia text'
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error extracting books from text:', error);
    }
    
    return books;
}

// Hebrew place name equivalents - maps alternative Hebrew names for the same location
const PLACE_NAME_EQUIVALENTS = {
    'מיינץ': 'מגנצא',
    'מגנצא': 'מיינץ',
    'ורמייזא': 'ורמס',
    'ורמס': 'ורמייזא',
    'שפירא': 'שפייר',
    'שפייר': 'שפירא',
    'קהיר': 'קהירה',
    'קהירה': 'קהיר',
    'ירושלים': 'ירושלם',
    'ירושלם': 'ירושלים',
    'צפת': 'צפד',
    'צפד': 'צפת',
    'טבריה': 'טבריא',
    'טבריא': 'טבריה',
    'פרנקפורט': 'פרנקפורט על המיין',
    'פרנקפורט על המיין': 'פרנקפורט',
    'ניו יורק': 'נו יורק',
    'נו יורק': 'ניו יורק'
};

/**
 * Get Hebrew equivalent place name if exists
 */
function getPlaceNameWithEquivalent(placeName) {
    if (!placeName) return placeName;
    
    const trimmed = placeName.trim();
    const equivalent = PLACE_NAME_EQUIVALENTS[trimmed];
    
    if (equivalent) {
        return `${trimmed} (${equivalent})`;
    }
    
    return trimmed;
}

/**
 * Get the Wikipedia-compatible city name for map lookup
 * Uses the modern Hebrew name that Wikipedia uses for city pages
 */
function getWikipediaCompatibleCityName(placeName) {
    if (!placeName) return placeName;
    
    // Remove parentheses and content inside them
    let cleaned = placeName.replace(/\s*\([^)]*\)/g, '').trim();
    
    // Wikipedia-compatible names (modern Hebrew names)
    const wikipediaNames = {
        'מגנצא': 'מיינץ',
        'ורמייזא': 'ורמס',
        'שפירא': 'שפייר',
        'קהיר': 'קהירה',
        'צפת': 'צפד',
        'טבריה': 'טבריא',
        'פרנקפורט': 'פרנקפורט על המיין',
        'ניו יורק': 'ניו יורק'
    };
    
    return wikipediaNames[cleaned] || cleaned;
}

/**
 * Fetch Wikipedia page content
 */
function fetchWikipedia(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': USER_AGENT
            }
        };

        https.get(url, options, (response) => {
            // Set encoding to UTF-8 to properly handle Hebrew characters
            response.setEncoding('utf8');
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (e) {
                    reject(new Error('Failed to parse Wikipedia response'));
                }
            });
        }).on('error', reject);
    });
}

/**
 * Extract rabbi data from Wikipedia infobox and text
 */
function extractRabbiData(html, pageTitle) {
    const confidence = { overall: 0, fields: {} };
    const rabbi = {
        FullName: '',
        knownAs: '',
        YearOfBirth: null,
        YearOfDeath: null,
        HebDob: null,
        HebDoP: null,
        HebCharDob: '',
        HebCharDoP: '',
        PlaceOfBirth: '',
        PlaceOfPtira: '',
        City: '',
        Country: '',
        Period: '',
        KnownFor: '',
        Notes: '',
        Sources: '',
        URL: '',
        Approx: 0,
        LocationMap: ''
    };

    // Extract full name - first bold tag in first real paragraph
    // Match paragraphs directly from raw HTML, then clean content
    const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gis);
    
    if (paragraphs && paragraphs.length > 0) {
        // Clean the first paragraph
        const firstPara = paragraphs[0].replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<a[^>]*>/gi, '').replace(/<\/a>/gi, '');
        
        // Extract first bold
        const boldMatch = firstPara.match(/<b>([^<]+)<\/b>/);
        if (boldMatch) {
            const boldText = boldMatch[1].trim();
            // If bold text looks like a full name (contains rabbi titles or is substantial)
            if (boldText.match(/רבי |רב |ר' |הרב /)) {
                rabbi.FullName = boldText;
                confidence.fields.FullName = 90;
            } else {
                rabbi.FullName = pageTitle.replace(/_/g, ' ');
                confidence.fields.FullName = 50;
            }
        } else {
            rabbi.FullName = pageTitle.replace(/_/g, ' ');
            confidence.fields.FullName = 40;
        }
    } else {
        rabbi.FullName = pageTitle.replace(/_/g, ' ');
        confidence.fields.FullName = 30;
    }

    // Extract known as - look for second bold in first paragraph (often the acronym)
    if (paragraphs && paragraphs.length > 0) {
        const firstPara = paragraphs[0].replace(/<sup[^>]*>.*?<\/sup>/gi, '').replace(/<a[^>]*>/gi, '').replace(/<\/a>/gi, '');
        const bolds = firstPara.match(/<b>([^<]+)<\/b>/g);
        if (bolds && bolds.length > 1) {
            const secondBold = bolds[1].replace(/<\/?b>/g, '').trim();
            rabbi.knownAs = secondBold;
            confidence.fields.knownAs = 85;
        } else {
            rabbi.knownAs = pageTitle.replace(/_/g, ' ');
            confidence.fields.knownAs = 60;
        }
    } else {
        rabbi.knownAs = pageTitle.replace(/_/g, ' ');
        confidence.fields.knownAs = 50;
    }

    // Track if dates are approximate
    let datesAreApprox = false;

    // Extract death year with approximation detection
    // Pattern 1: Look for death year in infobox (both "פטירה" and "תאריך פטירה")
    let deathMatch = html.match(/<th[^>]*>\s*(?:תאריך )?פטירה\s*<\/th>\s*<td[^>]*>(.*?)<\/td>/is);
    if (deathMatch) {
        const tdContent = deathMatch[1];
        // Check for approximation indicators
        if (/בקירוב|סביב|כ-|~|circa|around|approx|בערך/i.test(tdContent)) {
            datesAreApprox = true;
        }
        // Extract Gregorian year (prioritize years 1-2100, not Hebrew years 4000-6000)
        const yearMatches = tdContent.match(/\b(\d{3,4})\b/g);
        if (yearMatches) {
            for (const yearStr of yearMatches) {
                const year = parseInt(yearStr);
                // Accept years between 1 and 2100 (Gregorian), skip Hebrew years (4000+)
                if (year >= 1 && year <= 2100) {
                    rabbi.YearOfDeath = year;
                    confidence.fields.YearOfDeath = datesAreApprox ? 60 : 85;
                    break;
                }
            }
        }
    } else {
        // Pattern 2: "נפטר ב-<a>1280</a>" in text
        deathMatch = html.match(/נפטר.*?<a[^>]*>(\d{4})<\/a>/);
        if (deathMatch) {
            rabbi.YearOfDeath = parseInt(deathMatch[1]);
            confidence.fields.YearOfDeath = 85;
        } else {
            // Pattern 3: "נפטר ב-1280" without link
            deathMatch = html.match(/נפטר\s+ב-?(\d{4})/);
            if (deathMatch) {
                rabbi.YearOfDeath = parseInt(deathMatch[1]);
                confidence.fields.YearOfDeath = 75;
            }
        }
    }

    // Extract birth year with approximation detection
    // Pattern 1: Look for birth year in infobox (both "לידה" and "תאריך לידה")
    let birthMatch = html.match(/<th[^>]*>\s*(?:תאריך )?לידה\s*<\/th>\s*<td[^>]*>(.*?)<\/td>/is);
    if (birthMatch) {
        const tdContent = birthMatch[1];
        // Check for approximation indicators
        if (/בקירוב|סביב|כ-|~|circa|around|approx|בערך/i.test(tdContent)) {
            datesAreApprox = true;
        }
        // Extract Gregorian year (prioritize years 1-2100, not Hebrew years 4000-6000)
        // Look for standalone 3-4 digit year that's not a Hebrew year
        const yearMatches = tdContent.match(/\b(\d{3,4})\b/g);
        if (yearMatches) {
            for (const yearStr of yearMatches) {
                const year = parseInt(yearStr);
                // Accept years between 1 and 2100 (Gregorian), skip Hebrew years (4000+)
                if (year >= 1 && year <= 2100) {
                    rabbi.YearOfBirth = year;
                    confidence.fields.YearOfBirth = datesAreApprox ? 60 : 85;
                    break;
                }
            }
        }
    } else {
        // Pattern 2: "נולד ב-<a>1210</a>" in text
        birthMatch = html.match(/נולד.*?<a[^>]*>(\d{4})<\/a>/);
        if (birthMatch) {
            rabbi.YearOfBirth = parseInt(birthMatch[1]);
            confidence.fields.YearOfBirth = 85;
        } else {
            // Pattern 3: "נולד ב-1210" without link
            birthMatch = html.match(/נולד\s+ב-?(\d{4})/);
            if (birthMatch) {
                rabbi.YearOfBirth = parseInt(birthMatch[1]);
                confidence.fields.YearOfBirth = 75;
            }
        }
    }
    
    // If death year found but no birth year, estimate (assume ~70 year lifespan)
    if (rabbi.YearOfDeath && !rabbi.YearOfBirth) {
        rabbi.YearOfBirth = rabbi.YearOfDeath - 70;
        confidence.fields.YearOfBirth = 35; // Low confidence - it's an estimate
        datesAreApprox = true;
    }

    // Set Approx flag if dates are approximate or estimated
    rabbi.Approx = datesAreApprox ? 1 : 0;

    // Extract Hebrew dates - look for Hebrew year format in birth/death fields
    // Hebrew dates can be in the same field as Gregorian dates
    // Example: "990<br/>ד'תש"ן" or just "ד'תש"ן"
    
    // Pattern 1: Extract from לידה field (birth)
    if (birthMatch) {
        const tdContent = birthMatch[1];
        
        // Look for Hebrew year in letter format (like ד'תש"ן or ה'תשפ"ד)
        // Match: ד' or ה' followed by 2-4 Hebrew letters with gershayim
        const hebLetterMatch = tdContent.match(/([דה]['׳][א-ת]{1,4}["״][א-ת])/);
        if (hebLetterMatch) {
            const hebrewYear = hebLetterMatch[1].trim();
            rabbi.HebCharDob = hebrewYear;
            confidence.fields.HebCharDob = 90;
            
            // Convert Hebrew letters to numeric year
            const numericYear = convertHebrewYearToNumeric(hebrewYear);
            if (numericYear) {
                rabbi.HebDob = numericYear;
                confidence.fields.HebDob = 90;
            }
        }
    }

    // Pattern 2: Extract from פטירה field (death)
    if (deathMatch) {
        const tdContent = deathMatch[1];
        
        // Look for Hebrew year in letter format (like ד'תתכ"ד)
        const hebLetterMatch = tdContent.match(/([דה]['׳][א-ת]{1,4}["״][א-ת])/);
        if (hebLetterMatch) {
            rabbi.HebCharDoP = hebLetterMatch[1].trim();
            confidence.fields.HebCharDoP = 90;
            
            // Convert Hebrew letters to numeric year
            const numericYear = convertHebrewYearToNumeric(hebLetterMatch[1]);
            if (numericYear) {
                rabbi.HebDoP = numericYear;
                confidence.fields.HebDoP = 90;
            }
        }
    }
    
    // Auto-calculate Hebrew years from Gregorian if not found in Wikipedia
    if (rabbi.YearOfBirth && !rabbi.HebDob) {
        rabbi.HebDob = gregorianToHebrewYear(rabbi.YearOfBirth);
        rabbi.HebCharDob = hebrewYearToLetters(rabbi.HebDob);
        confidence.fields.HebDob = 70;
        confidence.fields.HebCharDob = 70;
    }
    
    if (rabbi.YearOfDeath && !rabbi.HebDoP) {
        rabbi.HebDoP = gregorianToHebrewYear(rabbi.YearOfDeath);
        rabbi.HebCharDoP = hebrewYearToLetters(rabbi.HebDoP);
        confidence.fields.HebDoP = 70;
        confidence.fields.HebCharDoP = 70;
    }

    // Extract country - multiple patterns
    // Pattern 1: Look in infobox for מדינה field
    let countryMatch = html.match(/(?:מדינה|ארץ)[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (countryMatch) {
        const tdContent = countryMatch[1];
        const linkMatch = tdContent.match(/<a[^>]+title="([^"]+)"/);
        if (linkMatch) {
            rabbi.Country = linkMatch[1].trim();
            confidence.fields.Country = 90;
        } else {
            rabbi.Country = tdContent.replace(/<[^>]+>/g, '').trim();
            confidence.fields.Country = 85;
        }
    } else {
        // Pattern 2: "ראשוני איטליה" patterns
        countryMatch = html.match(/ראשוני<\/a>\s+([א-ת]+)/);
        if (countryMatch) {
            rabbi.Country = countryMatch[1];
            confidence.fields.Country = 80;
        } else {
            // Pattern 3: Extract from lידה or פטירה field - look for country names in links
            const birthDeathMatch = html.match(/<th[^>]*>\s*(?:לידה|פטירה)\s*<\/th>\s*<td[^>]*>(.*?)<\/td>/is);
            if (birthDeathMatch) {
                const tdContent = birthDeathMatch[1];
                // Look for common country names in Hebrew
                const countryPatterns = [
                    'אוסטריה', 'גרמניה', 'פולין', 'איטליה', 'ספרד', 'צרפת',
                    'אנגליה', 'רוסיה', 'אוקראינה', 'הולנד', 'בלגיה', 'שווייץ',
                    'ארצות הברית', 'ישראל', 'ארץ ישראל', 'מרוקו', 'תורכיה'
                ];
                for (const country of countryPatterns) {
                    if (tdContent.includes(country)) {
                        rabbi.Country = country;
                        confidence.fields.Country = 75;
                        break;
                    }
                }
            }
        }
    }

    // Extract city - multiple patterns
    // Pattern 1: Look in infobox for עיר or יישוב field
    let cityMatch = html.match(/(?:עיר|יישוב|מקום מגורים)[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (cityMatch) {
        const tdContent = cityMatch[1];
        const linkMatch = tdContent.match(/<a[^>]+title="([^"]+)"/);
        if (linkMatch) {
            rabbi.City = linkMatch[1].trim();
            confidence.fields.City = 90;
        } else {
            rabbi.City = tdContent.replace(/<[^>]+>/g, '').trim();
            confidence.fields.City = 85;
        }
    } else {
        // Pattern 2: Extract city from family name - patterns like "די טראני", "מנושטאדט"
        cityMatch = rabbi.FullName.match(/(?:די|מ|מן)\s+([א-ת]+)/);
        if (cityMatch) {
            rabbi.City = cityMatch[1];
            confidence.fields.City = 70;
        }
    }

    // Extract place of birth - improved patterns for infobox
    // Pattern 1: מקום לידה in table row with link
    let birthPlaceMatch = html.match(/מקום לידה[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (birthPlaceMatch) {
        // Extract text from links or plain text
        const tdContent = birthPlaceMatch[1];
        const linkMatch = tdContent.match(/<a[^>]+title="([^"]+)"/);
        if (linkMatch) {
            rabbi.PlaceOfBirth = linkMatch[1].trim();
            confidence.fields.PlaceOfBirth = 90;
        } else {
            // Remove all HTML tags and get text
            rabbi.PlaceOfBirth = tdContent.replace(/<[^>]+>/g, '').trim();
            confidence.fields.PlaceOfBirth = 85;
        }
    } else {
        // Pattern 2: Simple text after מקום לידה
        birthPlaceMatch = html.match(/מקום לידה[^\>]*\>([^\<]+)/);
        if (birthPlaceMatch) {
            rabbi.PlaceOfBirth = birthPlaceMatch[1].trim();
            confidence.fields.PlaceOfBirth = 80;
        } else {
            // Pattern 3: "נולד ב[מקום]" with linked city - extract from text paragraphs
            const bornLinkMatch = html.match(/נולד\s+ב<a[^>]+title="([^"]+)"[^>]*>([^<]+)<\/a>/i);
            if (bornLinkMatch) {
                // Use the link title (full city name)
                const cityName = bornLinkMatch[1].trim();
                // Filter out dates, years, and generic terms
                if (!cityName.match(/\d{3,4}/) && !cityName.includes('תש') && !cityName.includes('האימפריה')) {
                    rabbi.PlaceOfBirth = cityName;
                    confidence.fields.PlaceOfBirth = 85;
                }
            } else {
                // Pattern 4: Look for "נולד ב..." without link in plain text
                const bornTextMatch = html.match(/נולד\s+ב([א-ת][א-ת\s]+?)(?:\s+ל|<|,|\.|;)/);
                if (bornTextMatch) {
                    rabbi.PlaceOfBirth = bornTextMatch[1].trim();
                    confidence.fields.PlaceOfBirth = 70;
                }
            }
        }
    }
    
    // Add Hebrew equivalent for place of birth if exists
    if (rabbi.PlaceOfBirth) {
        rabbi.PlaceOfBirth = getPlaceNameWithEquivalent(rabbi.PlaceOfBirth);
    }

    // Extract place of death - improved patterns for infobox and text
    // Pattern 1: מקום פטירה in table row with link
    let deathPlaceMatch = html.match(/מקום פטירה[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (deathPlaceMatch) {
        // Extract text from links or plain text
        const tdContent = deathPlaceMatch[1];
        const linkMatch = tdContent.match(/<a[^>]+title="([^"]+)"/);
        if (linkMatch) {
            rabbi.PlaceOfPtira = linkMatch[1].trim();
            confidence.fields.PlaceOfPtira = 90;
        } else {
            // Remove all HTML tags and get text
            rabbi.PlaceOfPtira = tdContent.replace(/<[^>]+>/g, '').trim();
            confidence.fields.PlaceOfPtira = 85;
        }
    } else {
        // Pattern 2: Extract from פטירה field - look for city name in links
        const deathFieldMatch = html.match(/<th[^>]*>\s*פטירה\s*<\/th>\s*<td[^>]*>(.*?)<\/td>/is);
        if (deathFieldMatch) {
            const tdContent = deathFieldMatch[1];
            // Find all links in the death field
            const links = tdContent.match(/<a[^>]+title="([^"]+)"[^>]*>([^<]+)<\/a>/g);
            if (links) {
                for (const link of links) {
                    const titleMatch = link.match(/title="([^"]+)"/);
                    if (titleMatch) {
                        const title = titleMatch[1];
                        // Skip years, Hebrew dates, and generic empire/principality names
                        if (!title.match(/^\d+$/) && !title.match(/^ד'/) && 
                            !title.includes('תש') && !title.includes('תת') &&
                            !title.includes('נסיכות') && !title.includes('האימפריה') &&
                            !title.includes('הרומית') && !title.includes('הקדושה')) {
                            rabbi.PlaceOfPtira = title;
                            confidence.fields.PlaceOfPtira = 85;
                            break;
                        }
                    }
                }
            }
        }
        
        // Pattern 3: "נקבר ב[מקום]" - buried location from text
        if (!rabbi.PlaceOfPtira) {
            const buriedMatch = html.match(/נקבר\s+ב<a[^>]+title="([^"]+)"[^>]*>([^<]+)<\/a>/i);
            if (buriedMatch) {
                const cityName = buriedMatch[1].trim();
                if (!cityName.match(/\d{3,4}/) && !cityName.includes('תש')) {
                    rabbi.PlaceOfPtira = cityName;
                    confidence.fields.PlaceOfPtira = 80;
                }
            }
        }
        
        // Pattern 4: "נפטר ב[מקום]" from text paragraphs
        if (!rabbi.PlaceOfPtira) {
            const diedTextMatch = html.match(/נפטר\s+ב([א-ת][א-ת\s]+?)(?:\s+ב|<|,|\.|;)/);
            if (diedTextMatch) {
                rabbi.PlaceOfPtira = diedTextMatch[1].trim();
                confidence.fields.PlaceOfPtira = 70;
            }
        }
    }
    
    // Add Hebrew equivalent for place of death if exists
    if (rabbi.PlaceOfPtira) {
        rabbi.PlaceOfPtira = getPlaceNameWithEquivalent(rabbi.PlaceOfPtira);
    }

    // Extract Period - look for תקופה or period field in infobox
    const periodMatch = html.match(/(?:תקופה|דור|זמן)[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (periodMatch) {
        const tdContent = periodMatch[1].replace(/<[^>]+>/g, '').trim();
        rabbi.Period = tdContent;
        confidence.fields.Period = 80;
    } else if (rabbi.YearOfBirth || rabbi.YearOfDeath) {
        // Generate period from years if available - use birth or death year
        const yearToUse = rabbi.YearOfBirth || rabbi.YearOfDeath;
        const century = Math.ceil(yearToUse / 100);
        rabbi.Period = `המאה ה-${century}`;
        confidence.fields.Period = 60;
    }

    // Extract KnownFor - look for ידוע בזכות or first paragraph summary
    const knownForMatch = html.match(/(?:ידוע בזכות|ידוע כ)[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (knownForMatch) {
        const tdContent = knownForMatch[1].replace(/<[^>]+>/g, '').trim();
        rabbi.KnownFor = tdContent;
        confidence.fields.KnownFor = 80;
    } else if (paragraphs && paragraphs.length > 0) {
        // Extract from first paragraph - get text after first sentence
        const firstPara = paragraphs[0].replace(/<[^>]+>/g, '').trim();
        const sentences = firstPara.split(/[.!?]/);
        if (sentences.length > 1) {
            rabbi.KnownFor = sentences.slice(0, 2).join('. ').substring(0, 300);
            confidence.fields.KnownFor = 50;
        }
    }
    
    // Extract location map - look for location map images in infobox
    // Patterns: "מפת מיקום" or map images like "Germany location map.svg"
    const mapPatterns = [
        /<img[^>]+src="([^"]*location[^"]*\.(?:svg|png)[^"]*)"/i,
        /<img[^>]+alt="[^"]*מפת[^"]*"[^>]+src="([^"]+)"/i,
        /<a[^>]+class="[^"]*mw-file-description[^"]*"[^>]+href="([^"]+File:[^"]*location[^"]*)"/i
    ];
    
    for (const pattern of mapPatterns) {
        const mapMatch = html.match(pattern);
        if (mapMatch) {
            let mapUrl = mapMatch[1];
            // Convert relative URLs to absolute
            if (mapUrl.startsWith('//')) {
                mapUrl = 'https:' + mapUrl;
            } else if (mapUrl.startsWith('/')) {
                mapUrl = 'https://he.wikipedia.org' + mapUrl;
            }
            rabbi.LocationMap = mapUrl;
            confidence.fields.LocationMap = 80;
            break;
        }
    }

    // Fallback: If City is still empty, try to extract from PlaceOfBirth or PlaceOfPtira
    if (!rabbi.City) {
        const placeToUse = rabbi.PlaceOfBirth || rabbi.PlaceOfPtira;
        if (placeToUse) {
            // Extract city name - it might be "נושטאט, אוסטריה" or just "נושטאט"
            const cityParts = placeToUse.split(/[,،]/);
            if (cityParts.length > 0) {
                rabbi.City = cityParts[0].trim();
                confidence.fields.City = 50;
            }
        }
    }
    
    // Fallback: If PlaceOfBirth is not known, use City
    if (!rabbi.PlaceOfBirth && rabbi.City) {
        rabbi.PlaceOfBirth = rabbi.City;
        confidence.fields.PlaceOfBirth = 40;
    }
    
    // Fallback: If PlaceOfPtira (place of death) is not known, use City
    if (!rabbi.PlaceOfPtira && rabbi.City) {
        rabbi.PlaceOfPtira = rabbi.City;
        confidence.fields.PlaceOfPtira = 40;
    }
    
    // Fallback: If Country is still empty, try to extract from PlaceOfBirth or PlaceOfPtira
    if (!rabbi.Country) {
        const placeToUse = rabbi.PlaceOfBirth || rabbi.PlaceOfPtira;
        if (placeToUse) {
            // Extract country - look for comma-separated parts or known country names
            const placeParts = placeToUse.split(/[,،]/);
            if (placeParts.length > 1) {
                // Last part is often the country
                rabbi.Country = placeParts[placeParts.length - 1].trim();
                confidence.fields.Country = 50;
            } else {
                // Check if the place contains a known country name
                const countryPatterns = [
                    'אוסטריה', 'גרמניה', 'פולין', 'איטליה', 'ספרד', 'צרפת',
                    'אנגליה', 'רוסיה', 'אוקראינה', 'הולנד', 'בלגיה', 'שווייץ',
                    'ארצות הברית', 'ישראל', 'ארץ ישראל', 'מרוקו', 'תורכיה'
                ];
                for (const country of countryPatterns) {
                    if (placeToUse.includes(country)) {
                        rabbi.Country = country;
                        confidence.fields.Country = 50;
                        break;
                    }
                }
            }
        }
    }

    // Calculate overall confidence
    const scores = Object.values(confidence.fields);
    confidence.overall = scores.length > 0 
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
        : 0;

    return { rabbi, confidence };
}

/**
 * Extract books/seforim from Wikipedia
 */
function extractBooks(html) {
    const books = [];
    
    // First, extract books from KnownFor text using the extractBooksFromText helper
    const knownForMatch = html.match(/(?:ידוע בזכות|ידוע כ)[^\<]*<\/th>.*?<td[^>]*>(.*?)<\/td>/is);
    if (knownForMatch) {
        const tdContent = knownForMatch[1].replace(/<[^>]+>/g, '').trim();
        const booksFromKnownFor = extractBooksFromText(tdContent, html);
        books.push(...booksFromKnownFor);
    }
    
    // Also check first paragraph
    const paragraphs = html.match(/<p[^>]*>.*?<\/p>/gis);
    if (paragraphs && paragraphs.length > 0) {
        const firstPara = paragraphs[0].replace(/<[^>]+>/g, '').trim();
        const booksFromPara = extractBooksFromText(firstPara, html);
        books.push(...booksFromPara);
    }
    
    // Look for common section headers
    const sectionsRegex = /(?:ספרים|חיבורים|כתבים|יצירות)[^\<]*<\/h2>(.*?)(?:<h2|<\/div>)/is;
    const sectionMatch = html.match(sectionsRegex);
    
    if (sectionMatch) {
        const section = sectionMatch[1];
        
        // Extract list items
        const listItems = section.match(/<li[^>]*>(.*?)<\/li>/gi);
        
        if (listItems) {
            listItems.forEach(item => {
                // Remove HTML tags
                const text = item.replace(/<[^>]*>/g, '').trim();
                
                if (text && text.length > 2) {
                    // Try to extract year
                    const yearMatch = text.match(/\((\d{3,4})\)/);
                    const year = yearMatch ? parseInt(yearMatch[1]) : null;
                    
                    // Clean title
                    const title = text.replace(/\(\d{3,4}\)/, '').trim();
                    
                    books.push({
                        Title: title,
                        HebTitle: title,
                        YearPublished: year,
                        Notes: 'מרשימת ספרים בויקיפדיה',
                        confidence: 75
                    });
                }
            });
        }
    }
    
    return books;
}

/**
 * Extract relationships (teachers, students) from Wikipedia
 */
function extractRelationships(html) {
    const relationships = [];
    
    // Look for teachers (רבותיו, מוריו)
    const teachersMatch = html.match(/(?:רבותיו|מוריו)[^\<]*<\/th>(.*?)<\/tr>/is);
    if (teachersMatch) {
        const teachers = teachersMatch[1].match(/>([א-ת][^<]+)</g);
        if (teachers) {
            teachers.forEach(t => {
                const name = t.replace(/[><]/g, '').trim();
                if (name.length > 2) {
                    relationships.push({
                        type: 'teacher',
                        name: name,
                        relationshipCode: 30, // רבו של
                        confidence: 70
                    });
                }
            });
        }
    }
    
    // Look for students (תלמידיו)
    const studentsMatch = html.match(/תלמידיו[^\<]*<\/th>(.*?)<\/tr>/is);
    if (studentsMatch) {
        const students = studentsMatch[1].match(/>([א-ת][^<]+)</g);
        if (students) {
            students.forEach(s => {
                const name = s.replace(/[><]/g, '').trim();
                if (name.length > 2) {
                    relationships.push({
                        type: 'student',
                        name: name,
                        relationshipCode: 31, // תלמידו של
                        confidence: 70
                    });
                }
            });
        }
    }
    
    return relationships;
}

/**
 * Extract life events and interesting facts from Wikipedia
 */
function extractEvents(html) {
    const events = [];
    
    // Strip ALL HTML tags first
    let cleanText = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
    cleanText = cleanText.replace(/<style[^>]*>.*?<\/style>/gi, '');
    cleanText = cleanText.replace(/<[^>]+>/g, ' ');
    
    // Decode HTML entities
    cleanText = cleanText.replace(/&nbsp;/g, ' ');
    cleanText = cleanText.replace(/&quot;/g, '"');
    cleanText = cleanText.replace(/&amp;/g, '&');
    cleanText = cleanText.replace(/&lt;/g, '<');
    cleanText = cleanText.replace(/&gt;/g, '>');
    
    // Remove Wikipedia metadata and extra whitespace
    cleanText = cleanText.replace(/לעריכה בוויקינתונים[^\n]*/g, '');
    cleanText = cleanText.replace(/שמשמש מקור לחלק מהמידע[^\n]*/g, '');
    cleanText = cleanText.replace(/\s+/g, ' ');
    
    // Extract the first 2000 characters (opening paragraphs)
    const opening = cleanText.substring(0, 2000);
    
    // Split into sentences (by period, semicolon, or colon)
    const sentences = opening.split(/[\.;׃]/);
    
    for (const sentence of sentences) {
        const trimmed = sentence.trim();
        
        // Skip if too short, too long, or contains suspicious content
        if (trimmed.length < 25 || trimmed.length > 200 ||
            trimmed.includes('href') || trimmed.includes('src') ||
            trimmed.includes('wiki') || trimmed.includes('class')) {
            continue;
        }
        
        // Check if it has substantial Hebrew content
        const hebrewChars = (trimmed.match(/[א-ת]/g) || []).length;
        if (hebrewChars < 15) continue;
        
        // Try to extract year if present
        const yearMatch = trimmed.match(/(\d{3,4})/);
        const year = yearMatch ? parseInt(yearMatch[1]) : null;
        
        // Look for key biographical indicators
        const hasBiographicalContent = 
            /תלמיד|רב|מורה|פוסק|למד|לימד|כתב|חיבר|נולד|נפטר|התגורר|פעל|ידוע|נודע/.test(trimmed);
        
        if (hasBiographicalContent) {
            events.push({
                EventYear: year,
                HebEventDescription: trimmed,
                confidence: year ? 60 : 50
            });
        }
    }
    
    // Sort: events with years first
    events.sort((a, b) => {
        if (a.EventYear && !b.EventYear) return -1;
        if (!a.EventYear && b.EventYear) return 1;
        if (a.EventYear && b.EventYear) return a.EventYear - b.EventYear;
        return 0;
    });
    
    // Deduplicate similar events
    const unique = [];
    const seen = new Set();
    
    for (const event of events) {
        const key = event.HebEventDescription.substring(0, 50);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(event);
        }
    }
    
    return unique.slice(0, 5);
}

/**
 * Extract image URL from Wikipedia page (infobox image or main image)
 * @param {string} html - HTML content of the Wikipedia page
 * @param {string} cityName - Optional city name for city map extraction
 * @returns {string|null} - Image URL or null if not found
 */
function extractImageUrl(html, cityName = '') {
    // IF city name provided: extract city map
    if (cityName) {
        // Get English city name for filename matching (e.g., מיינץ → Mainz)
        const cityNameMap = {
            'מיינץ': 'Mainz',
            'מגנצא': 'Mainz',
            'ורמס': 'Worms',
            'ורמייזא': 'Worms',
            'שפייר': 'Speyer',
            'שפירא': 'Speyer',
            'ירושלים': 'Jerusalem',
            'ירושלם': 'Jerusalem',
            'צפד': 'Safed',
            'צפת': 'Safed',
            'טבריא': 'Tiberias',
            'טבריה': 'Tiberias'
        };
        
        const englishCityName = cityNameMap[cityName] || '';
        console.log(`Looking for city map, Hebrew: ${cityName}, English: ${englishCityName}`);
        
        // Log all images and links found to debug
        const allImagesPattern = /<img[^>]+src="(\/\/upload\.wikimedia\.org\/[^"]+\.(?:svg|png)[^"]*)"/gi;
        const allImageMatches = html.match(allImagesPattern);
        if (allImageMatches) {
            console.log(`Found ${allImageMatches.length} total img tags on page`);
            allImageMatches.slice(0, 25).forEach((img, index) => {
                const srcMatch = img.match(/src="([^"]+)"/i);
                if (srcMatch) {
                    const url = srcMatch[1];
                    const filename = url.split('/').pop().split('?')[0];
                    // Look for maps with city/country names
                    if (filename.toLowerCase().includes('map') || 
                        filename.toLowerCase().includes('location') ||
                        filename.toLowerCase().includes(cityName.toLowerCase())) {
                        console.log(`  MAP ${index + 1}. ${filename}`);
                    }
                }
            });
        }
        
        // Search for the location map div/template output with labels
        // Wikipedia uses <div class="locmap"> or similar for rendered maps
        const locmapPattern = /<div[^>]*class="[^"]*loc[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[\s\S]*?<\/div>/gi;
        const locmapMatches = [...html.matchAll(locmapPattern)];
        console.log(`Found ${locmapMatches.length} location map divs`);
        if (locmapMatches.length > 0) {
            locmapMatches.forEach((match, i) => {
                console.log(`  Locmap ${i + 1}: ${match[1].substring(0, 80)}`);
            });
        }
        
        // Also check for maps in href links (often the full-size version)
        const hrefPattern = /href="(\/\/upload\.wikimedia\.org\/[^"]+\.(?:svg|png)[^"]*)"/gi;
        const hrefMatches = html.match(hrefPattern);
        if (hrefMatches && hrefMatches.length > 0) {
            console.log(`Found ${hrefMatches.length} total map links (href)`);
            hrefMatches.slice(0, 10).forEach((link, index) => {
                const hrefMatch = link.match(/href="([^"]+)"/i);
                if (hrefMatch) {
                    const url = hrefMatch[1];
                    const filename = url.split('/').pop().split('?')[0];
                    if (filename.toLowerCase().includes(englishCityName.toLowerCase())) {
                        console.log(`  HREF ${index + 1}. ${filename}`);
                    }
                }
            });
        }
        
        // Priority 1: [City]_in_[Region] locator maps (these have red dots and labels baked in)
        if (englishCityName) {
            // Search for the pre-rendered locator map file anywhere in HTML
            // Pattern: City_in_Region.svg (e.g., "Mainz_in_Rhineland-Palatinate.svg")
            // These files have the red dot and city name already in the image
            
            // Search in any URL reference (src, href, or even plain text URLs)
            const cityInRegionPattern = new RegExp(`upload\\.wikimedia\\.org[^"\\s]*${englishCityName}_in_[^"\\s\\/]+\\.svg`, 'gi');
            const matches = [...html.matchAll(cityInRegionPattern)];
            
            console.log(`Searching for pattern: ${englishCityName}_in_*.svg`);
            console.log(`Found ${matches.length} potential matches`);
            
            for (let match of matches) {
                let imageUrl = match[0];
                const filename = imageUrl.toLowerCase();
                
                console.log(`  Checking: ${filename}`);
                
                // Skip generic location maps (we want specific city locators)
                if (filename.includes('_adm_location_map') || 
                    filename.includes('germany_location_map') ||
                    filename.includes('france_location_map') ||
                    filename.includes('rhineland-palatinate_location_map')) {
                    console.log('    Skipped (generic base map)');
                    continue;
                }
                
                // Found it! Clean up the URL
                imageUrl = imageUrl.replace(/\/thumb\//g, '/').replace(/\/\d+px-[^\/]+$/, '');
                if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;
                console.log('✓ Found city locator map with red dot:', imageUrl);
                return imageUrl;
            }
            
            // Fallback: Try PNG version
            const cityInRegionPngPattern = new RegExp(`upload\\.wikimedia\\.org[^"\\s]*${englishCityName}_in_[^"\\s\\/]+\\.png`, 'gi');
            const pngMatches = [...html.matchAll(cityInRegionPngPattern)];
            
            console.log(`PNG pattern matches: ${pngMatches.length}`);
            
            for (let match of pngMatches) {
                let imageUrl = match[0];
                const filename = imageUrl.toLowerCase();
                
                // Skip generic location maps
                if (filename.includes('_adm_location_map') || 
                    filename.includes('germany_location_map') ||
                    filename.includes('france_location_map') ||
                    filename.includes('rhineland-palatinate_location_map')) {
                    continue;
                }
                
                imageUrl = imageUrl.replace(/\/thumb\//g, '/').replace(/\/\d+px-[^\/]+$/, '');
                if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;
                console.log('✓ Found city locator map PNG with red dot:', imageUrl);
                return imageUrl;
            }
        }
        
        // Priority 2: Any map with city name (excluding emblems/flags)
        if (englishCityName) {
            const anyMapPattern = new RegExp(`src="(\\/\\/upload\\.wikimedia\\.org\\/[^"]*${englishCityName}[^"]*\\.(?:svg|png)[^"]*)"`, 'gi');
            const matches = html.match(anyMapPattern);
            if (matches) {
                for (let matchStr of matches) {
                    const srcMatch = matchStr.match(/src="([^"]+)"/i);
                    if (srcMatch) {
                        let imageUrl = srcMatch[1];
                        const filename = imageUrl.toLowerCase();
                        // Skip emblems/coats/flags
                        if (filename.includes('coat') || filename.includes('wappen') || 
                            filename.includes('emblem') || filename.includes('arms') ||
                            filename.includes('flag') || filename.includes('flagge') ||
                            filename.includes('seal')) {
                            continue;
                        }
                        imageUrl = imageUrl.replace(/\/thumb\//g, '/').replace(/\/\d+px-[^\/]+$/, '');
                        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                        console.log('Found city map:', imageUrl);
                        return imageUrl;
                    }
                }
            }
        }
        
        // Priority 3: Fallback to infobox location map (usually shows country/region with city marked)
        // Look for location_map in infobox, but EXCLUDE generic adm_location_map files
        const infoboxMapPattern = /<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i;
        const infoboxMatch = html.match(infoboxMapPattern);
        if (infoboxMatch) {
            const infoboxHtml = infoboxMatch[1];
            // Look for location map images (usually 250px or larger)
            const locationMapPattern = /<img[^>]+src="(\/\/upload\.wikimedia\.org\/[^"]*location_map[^"]*\.(?:svg|png)[^"]*)"/gi;
            const mapMatches = [...infoboxHtml.matchAll(locationMapPattern)];
            
            for (let mapMatch of mapMatches) {
                let imageUrl = mapMatch[1];
                const filename = imageUrl.toLowerCase();
                
                // Skip generic administrative location maps - they don't have red dots
                if (filename.includes('_adm_location_map') || 
                    filename.includes('germany_location_map') ||
                    filename.includes('france_location_map') ||
                    filename.includes('israel_location_map')) {
                    console.log('Skipping generic location map:', filename);
                    continue;
                }
                
                // Get the larger version (usually available)
                imageUrl = imageUrl.replace(/\/thumb\//g, '/').replace(/\/\d+px-[^\/]+$/, '');
                if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
                console.log('Found infobox location map:', imageUrl);
                return imageUrl;
            }
        }
        
        console.log('No suitable city map found');
        return null;
    }
    
    // ELSE: extract rabbi/person image from infobox
    console.log('Looking for rabbi/person image in infobox');
    const infoboxPattern = /<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i;
    const infoboxMatch = html.match(infoboxPattern);
    if (infoboxMatch) {
        const infoboxHtml = infoboxMatch[1];
        const imagePattern = /<img[^>]+src="(\/\/upload\.wikimedia\.org\/[^"]+\.(?:jpg|jpeg|png)[^"]*)"/i;
        const imageMatch = infoboxHtml.match(imagePattern);
        if (imageMatch) {
            let imageUrl = imageMatch[1].replace(/\/thumb\//g, '/').replace(/\/\d+px-[^\/]+$/, '');
            if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
            console.log('Found infobox image:', imageUrl);
            return imageUrl;
        }
    }
    
    console.log('No suitable rabbi image found');
    return null;
}

/**
 * Fetch city/location map from Wikipedia
 */
async function fetchCityMap(cityName) {
    try {
        // Get Wikipedia-compatible city name (e.g., מגנצא → מיינץ)
        const wikipediaCity = getWikipediaCompatibleCityName(cityName);
        
        console.log(`Fetching city map for: ${cityName}`);
        if (wikipediaCity !== cityName) {
            console.log(`Using Wikipedia name: ${wikipediaCity}`);
        }
        
        // Get English city name for English Wikipedia
        const cityNameMap = {
            'מיינץ': 'Mainz',
            'מגנצא': 'Mainz',
            'ורמס': 'Worms',
            'ורמייזא': 'Worms',
            'שפייר': 'Speyer',
            'שפירא': 'Speyer',
            'ירושלים': 'Jerusalem',
            'ירושלם': 'Jerusalem',
            'צפד': 'Safed',
            'צפת': 'Safed',
            'טבריא': 'Tiberias',
            'טבריה': 'Tiberias'
        };
        
        const englishCityName = cityNameMap[wikipediaCity] || wikipediaCity;
        
        // Known locator map URLs - these have red dots but NO text labels
        // Wikipedia's labeled maps are generated dynamically and can't be extracted as static files
        // Use PNG version for better compatibility with image processing
        const locatorMapUrls = {
            'Mainz': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png',
            'Worms': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png',  // TODO: find correct map
            'Speyer': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png',  // TODO: find correct map
            'Jerusalem': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png',  // TODO: find correct map
            'Safed': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png',  // TODO: find correct map
            'Tiberias': 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mainz_in_Germany.png'  // TODO: find correct map
        };
        
        // Use the red dot map if available (we'll overlay the city name in the UI)
        if (locatorMapUrls[englishCityName]) {
            console.log(`Using red dot map for ${englishCityName}`);
            return {
                cityName: englishCityName,
                hebrewCityName: cityName,
                imageUrl: locatorMapUrls[englishCityName],
                pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(englishCityName)}`
            };
        }
        
        // Otherwise try to find any map on Wikipedia
        console.log(`No hardcoded map, searching Wikipedia...`);
        
        // Try Hebrew Wikipedia first to get maps with Hebrew labels
        console.log(`Trying Hebrew Wikipedia for: ${wikipediaCity}`);
        const encodedCity = encodeURIComponent(wikipediaCity);
        const hebrewApiUrl = `https://he.wikipedia.org/w/api.php?action=parse&format=json&page=${encodedCity}&prop=text&redirects=1`;
        
        const hebrewData = await fetchWikipedia(hebrewApiUrl);
        
        if (hebrewData.parse) {
            const html = hebrewData.parse.text['*'];
            const pageTitle = hebrewData.parse.title;
            
            // Pass Hebrew city name to help find the right map
            let imageUrl = extractImageUrl(html, wikipediaCity);
            
            if (imageUrl) {
                console.log(`Found city page: ${pageTitle}`);
                console.log(`Extracted image URL: ${imageUrl}`);
                
                return {
                    cityName: pageTitle,
                    hebrewCityName: cityName,
                    imageUrl: imageUrl,
                    pageUrl: `https://he.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
                };
            }
            console.log('No map found on Hebrew Wikipedia, trying English...');
        }
        
        // Fallback to English Wikipedia
        console.log(`Trying English Wikipedia for: ${englishCityName}`);
        const encodedEnglishCity = encodeURIComponent(englishCityName);
        const englishApiUrl = `https://en.wikipedia.org/w/api.php?action=parse&format=json&page=${encodedEnglishCity}&prop=text&redirects=1`;
        
        const englishData = await fetchWikipedia(englishApiUrl);
        
        if (englishData.parse) {
            const html = englishData.parse.text['*'];
            const pageTitle = englishData.parse.title;
            
            // Pass English city name to help find the right map
            const imageUrl = extractImageUrl(html, englishCityName);
            
            if (imageUrl) {
                console.log(`Found English city page: ${pageTitle}`);
                console.log(`Extracted image URL: ${imageUrl}`);
                
                return {
                    cityName: pageTitle,
                    hebrewCityName: cityName,
                    imageUrl: imageUrl,
                    pageUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`
                };
            }
        }
        
        console.log(`No Wikipedia page found for city: ${wikipediaCity}`);
        
        // Try alternative: if city has comma, try just the first part
        if (wikipediaCity.includes(',')) {
            const firstPart = wikipediaCity.split(',')[0].trim();
            console.log(`Trying alternative city name: ${firstPart}`);
            return await fetchCityMap(firstPart);
        }
        
        return null;
    } catch (error) {
        console.error(`Failed to fetch city map for ${cityName}:`, error.message);
        return null;
    }
}

// Convert Hebrew year letters to numeric (e.g., "ד'תש"ן" -> 4750)
function convertHebrewYearToNumeric(hebrewYear) {
    if (!hebrewYear) return null;
    
    // Hebrew letter values
    const letterValues = {
        'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9,
        'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50, 
        'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90,
        'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400
    };
    
    // Check for millennium prefix (ד' = 4000, ה' = 5000)
    let millennium = 0;
    let yearPart = hebrewYear;
    
    if (hebrewYear.startsWith('ד\'') || hebrewYear.startsWith('ד׳')) {
        millennium = 4000;
        yearPart = hebrewYear.substring(2); // Remove ד' prefix
    } else if (hebrewYear.startsWith('ה\'') || hebrewYear.startsWith('ה׳')) {
        millennium = 5000;
        yearPart = hebrewYear.substring(2); // Remove ה' prefix
    }
    
    // Remove geresh and gershayim marks from the year part
    const cleaned = yearPart.replace(/['׳"״']/g, '');
    
    let total = 0;
    for (let i = 0; i < cleaned.length; i++) {
        const letter = cleaned[i];
        if (letterValues[letter]) {
            total += letterValues[letter];
        }
    }
    
    // Add millennium prefix if it was found
    if (millennium > 0) {
        total += millennium;
    } else if (total > 0 && total < 1000) {
        // If no prefix but year < 1000, assume 4000 or 5000 based on value
        if (total < 800) {
            total += 4000; // e.g., תש"ן (750) -> 4750
        } else {
            total += 5000; // e.g., תשפ"ד (784) -> 5784
        }
    }
    
    return total > 0 ? total : null;
}

module.exports = {
    fetchWikipedia,
    extractRabbiData,
    extractBooks,
    extractRelationships,
    extractEvents,
    extractImageUrl,
    fetchCityMap,
    convertHebrewYearToNumeric,
    getPlaceNameWithEquivalent,
    getWikipediaCompatibleCityName,
    USER_AGENT
};
