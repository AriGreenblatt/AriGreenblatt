const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// Rate limiting to be respectful to HebrewBooks.org
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchHebrewBooks(authorName) {
    console.log(`\n🔍 Searching HebrewBooks.org for books by: ${authorName}`);
    
    try {
        // HebrewBooks.org search URL
        const searchUrl = `https://www.hebrewbooks.org/search?q=${encodeURIComponent(authorName)}`;
        console.log(`Search URL: ${searchUrl}`);
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const $ = cheerio.load(response.data);
        const books = [];
        
        // Parse search results to find book IDs and titles
        // HebrewBooks.org uses format: /book_id
        $('a[href*="/"]').each((i, elem) => {
            const href = $(elem).attr('href');
            const text = $(elem).text().trim();
            
            // Match book links (format: /12345 or /pdfpager.aspx?req=12345)
            const bookIdMatch = href?.match(/\/(\d+)$/) || href?.match(/req=(\d+)/);
            if (bookIdMatch && text && text.length > 0) {
                const bookId = bookIdMatch[1];
                if (!books.find(b => b.id === bookId)) {
                    books.push({
                        id: bookId,
                        title: text,
                        url: `https://www.hebrewbooks.org/${bookId}`
                    });
                }
            }
        });
        
        console.log(`✅ Found ${books.length} books`);
        return books;
        
    } catch (error) {
        console.error(`❌ Error searching HebrewBooks.org:`, error.message);
        return [];
    }
}

async function getBookDownloadUrl(bookId) {
    try {
        // HebrewBooks.org PDF download URL format
        return `https://www.hebrewbooks.org/pagefeed/hebrewbooks_org_${bookId}.pdf`;
    } catch (error) {
        console.error(`❌ Error getting download URL for book ${bookId}:`, error.message);
        return null;
    }
}

async function downloadPDF(book, outputDir) {
    const downloadUrl = await getBookDownloadUrl(book.id);
    if (!downloadUrl) {
        console.log(`⚠️  Skipping book ${book.id} - no download URL`);
        return false;
    }
    
    // Sanitize filename - remove special characters
    const sanitizedTitle = book.title
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100); // Limit length
    
    const filename = `${book.id}_${sanitizedTitle}.pdf`;
    const filepath = path.join(outputDir, filename);
    
    console.log(`\n📥 Downloading: ${book.title}`);
    console.log(`   Book ID: ${book.id}`);
    console.log(`   URL: ${downloadUrl}`);
    console.log(`   Saving to: ${filepath}`);
    
    try {
        const response = await axios({
            method: 'get',
            url: downloadUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 60000 // 60 second timeout
        });
        
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`   ✅ Downloaded successfully`);
                resolve(true);
            });
            writer.on('error', (err) => {
                console.error(`   ❌ Error writing file:`, err.message);
                reject(err);
            });
        });
        
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`   ⚠️  PDF not available (404)`);
        } else {
            console.error(`   ❌ Error downloading:`, error.message);
        }
        return false;
    }
}

async function downloadBooksForRabbi(rabbiName, outputDir = 'C:\\project1\\RaboteinuZl\\PDF') {
    console.log('\n' + '='.repeat(80));
    console.log('📚 HebrewBooks.org PDF Downloader');
    console.log('='.repeat(80));
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 Created directory: ${outputDir}`);
    }
    
    // Search for books
    const books = await searchHebrewBooks(rabbiName);
    
    if (books.length === 0) {
        console.log('\n⚠️  No books found. Try different spelling or Hebrew name.');
        return;
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📖 Books found:');
    console.log('='.repeat(80));
    books.forEach((book, i) => {
        console.log(`${i + 1}. [${book.id}] ${book.title}`);
    });
    
    // Download each book with rate limiting
    let successCount = 0;
    let failCount = 0;
    
    console.log('\n' + '='.repeat(80));
    console.log('⬇️  Starting downloads...');
    console.log('='.repeat(80));
    
    for (let i = 0; i < books.length; i++) {
        const book = books[i];
        
        // Rate limiting - wait 2 seconds between downloads
        if (i > 0) {
            console.log('\n⏱️  Waiting 2 seconds (rate limiting)...');
            await delay(2000);
        }
        
        const success = await downloadPDF(book, outputDir);
        if (success) {
            successCount++;
        } else {
            failCount++;
        }
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 Download Summary');
    console.log('='.repeat(80));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Location: ${outputDir}`);
    console.log('='.repeat(80) + '\n');
}

// Command line usage
if (require.main === module) {
    const rabbiName = process.argv[2];
    
    if (!rabbiName) {
        console.log('\n❌ Usage: node download-hebrewbooks-pdfs.js "Rabbi Name"');
        console.log('\nExamples:');
        console.log('  node download-hebrewbooks-pdfs.js "ריא\\"ז"');
        console.log('  node download-hebrewbooks-pdfs.js "רש\\"י"');
        console.log('  node download-hebrewbooks-pdfs.js "רמב\\"ם"');
        process.exit(1);
    }
    
    downloadBooksForRabbi(rabbiName)
        .then(() => {
            console.log('✅ Process completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { downloadBooksForRabbi, searchHebrewBooks };
