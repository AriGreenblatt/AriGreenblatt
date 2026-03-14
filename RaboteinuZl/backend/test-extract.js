// Test extraction for ריא"ז
const https = require('https');

const url = 'https://he.wikipedia.org/w/api.php?action=parse&format=json&page=ריא"ז&prop=text&redirects=1';

https.get(url, {
    headers: {
        'User-Agent': 'Mozilla/5.0'
    }
}, (response) => {
    let data = '';
    response.on('data', (chunk) => data += chunk);
    response.on('end', () => {
        const parsed = JSON.parse(data);
        const html = parsed.parse.text['*'];
        
        // Find the exact text around נפטר
        const idx = html.indexOf('נפטר');
        if (idx > 0) {
            console.log('Raw HTML around נפטר:');
            console.log(html.substring(idx, idx + 200));
        }
        
        // Test pattern
        let match = html.match(/נפטר[^>]*>[^<]*<a[^>]*>(\d{4})<\/a>/);
        console.log('\nPattern match result:', match ? match[1] : 'no match');
        
        // Try simpler
        match = html.match(/נפטר.*?(\d{4})/);
        console.log('Simple match:', match ? match[1] : 'no match');
    });
});
