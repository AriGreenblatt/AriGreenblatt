# Odot Directory - Biographical Content

This directory stores biographical content about Talmidei Hahamim.

## File Naming Convention
Files should be named using the rabbi's known name with special characters replaced by underscores.
For example: `רש_י.txt` or `רמב_ם.txt`

## Usage

### API Endpoints

1. **GET /api/odot/:title** - Retrieve content (checks file first, then Wikipedia)
2. **POST /api/odot/:title** - Save content to file
   - Body: `{ "content": "..." }`
3. **GET /api/odot** - List all available files

### Content Sources (Priority Order)
1. **Local file** - Check if text file exists in this directory
2. **Wikipedia** - Fetch from Hebrew Wikipedia if no file exists
3. **Auto-cache** - Optionally save Wikipedia content to file (disabled by default)

## Manual Editing
You can manually create or edit `.txt` files in this directory. The content will be:
- Displayed in the "אודות" tab in the app
- Prioritized over Wikipedia content
- UTF-8 encoded plain text or HTML

## Example Workflow

1. Copy biographical text from Wikipedia or other sources
2. Save as `[name].txt` in this directory
3. Edit and curate the content
4. App will automatically use your curated version
