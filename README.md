# Intelligent Application Management System

An enterprise-level application for managing and organizing duplicate applications with intelligent categorization.

## Features

- **Directory Scanner**: Recursively scan directories for application files
- **Duplicate Detection**: SHA-256 hash-based duplicate detection
- **Rule-Based Categorization**: Flexible categorization system with customizable rules
- **Duplicate Management**: Safe deletion of duplicate files with logging
- **File Organization**: Automatic organization into category-based folders
- **Web Interface**: Modern React-based dashboard
- **CLI Tool**: Command-line interface for automation
- **Comprehensive Logging**: Detailed operation logs and reports
- **Export Capabilities**: JSON and CSV report generation

## Supported File Types

- Windows: `.exe`, `.msi`, `.appx`
- macOS: `.app`, `.dmg`, `.pkg`
- Linux: `.deb`, `.rpm`, `.snap`, `.sh`
- Android: `.apk`

## Installation

### Web Application

1. Clone the repository
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
4. Open http://localhost:3000 in your browser

### CLI Tool

1. Ensure Python 3.7+ is installed
2. Install required packages:
   \`\`\`bash
   pip install pyyaml
   \`\`\`
3. Make the CLI tool executable:
   \`\`\`bash
   chmod +x scripts/cli-tool.py
   \`\`\`

## Usage

### Web Interface

1. **Dashboard**: View system statistics and scan status
2. **Scan**: Enter a directory path and start scanning
3. **Duplicates**: Review and manage duplicate files
4. **Categories**: View categorized applications
5. **Rules**: Configure categorization rules
6. **Logs**: Monitor system activity

### Command Line

Basic scan:
\`\`\`bash
python scripts/cli-tool.py --directory /Applications
\`\`\`

Scan with organization:
\`\`\`bash
python scripts/cli-tool.py --directory /Applications --organize
\`\`\`

Dry run (no changes):
\`\`\`bash
python scripts/cli-tool.py --directory /Applications --dry-run --organize
\`\`\`

Delete specific duplicates:
\`\`\`bash
python scripts/cli-tool.py --directory /Applications --delete-duplicates "1,3,5"
\`\`\`

## Configuration

### Web Application

Configuration is managed through the web interface in the Rules tab.

### CLI Tool

Create a `config.yaml` file:

\`\`\`yaml
source_directory: "/Applications"
output_directory: "./output"
rules_file: "./rules.json"
dry_run: false
log_level: "INFO"
\`\`\`

## Categorization Rules

Rules are defined in JSON format with the following structure:

\`\`\`json
{
  "rules": [
    {
      "id": "1",
      "category": "Developer Tools",
      "keywords": ["code", "studio", "dev", "git"],
      "pathPatterns": ["/Developer", "/Applications/Developer"],
      "enabled": true
    }
  ]
}
\`\`\`

### Rule Matching

- **Keywords**: Match against file names (case-insensitive)
- **Path Patterns**: Match against full file paths (case-insensitive)
- **Enabled**: Toggle rule on/off

## API Endpoints

- `POST /api/scan` - Start directory scan
- `GET /api/duplicates` - Get duplicate groups
- `POST /api/delete` - Delete selected files
- `POST /api/organize` - Organize files by category
- `GET/POST /api/rules` - Manage categorization rules
- `GET /api/logs` - Retrieve system logs
- `GET /api/reports` - Download reports (JSON/CSV)

## File Organization

Files are organized into the following structure:

\`\`\`
output/
├── Developer_Tools/
├── Productivity/
├── Entertainment/
├── System_Utilities/
└── Uncategorized/
\`\`\`

## Logging

All operations are logged with timestamps and severity levels:

- **INFO**: Normal operations
- **WARN**: Non-critical issues
- **ERROR**: Critical errors

Logs are stored in:
- Web: `data/logs.json`
- CLI: `app_manager.log`

## Reports

### JSON Report
Contains complete scan results with metadata:
- File information
- Duplicate groups
- Categorization results
- Scan statistics

### CSV Report
Tabular format suitable for spreadsheet applications:
- File Name, Path, Hash, Category, Size

## Security Considerations

- File operations are logged for audit trails
- SHA-256 hashing ensures content-based duplicate detection
- Dry-run mode prevents accidental data loss
- Backup options available before file deletion

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure read/write permissions for target directories
2. **Large Files**: Consider adjusting `max_file_size` in configuration
3. **Memory Usage**: For large directories, enable parallel processing

### Performance Tips

- Use SSD storage for better I/O performance
- Enable parallel processing for large scans
- Consider using MD5 hashing for faster processing (less secure)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
