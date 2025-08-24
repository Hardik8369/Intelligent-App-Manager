#!/usr/bin/env python3
"""
Command-line interface for the Intelligent Application Management System
"""

import os
import sys
import json
import hashlib
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Set
import csv
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app_manager.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class AppManager:
    def __init__(self, config_path: str = None):
        self.config = self.load_config(config_path)
        self.app_extensions = {'.exe', '.msi', '.apk', '.sh', '.app', '.deb', '.rpm', '.dmg', '.pkg', '.appx', '.snap'}
        self.scanned_files = []
        self.duplicate_groups = []
        self.categorized_files = {}
        
    def load_config(self, config_path: str) -> Dict:
        """Load configuration from YAML or use defaults"""
        default_config = {
            'source_directory': '.',
            'output_directory': './output',
            'rules_file': './rules.json',
            'dry_run': False,
            'log_level': 'INFO'
        }
        
        if config_path and os.path.exists(config_path):
            try:
                import yaml
                with open(config_path, 'r') as f:
                    config = yaml.safe_load(f)
                return {**default_config, **config}
            except ImportError:
                logger.warning("PyYAML not installed, using default config")
            except Exception as e:
                logger.error(f"Error loading config: {e}")
        
        return default_config
    
    def calculate_file_hash(self, file_path: str) -> str:
        """Calculate SHA-256 hash of a file"""
        try:
            hash_sha256 = hashlib.sha256()
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Error calculating hash for {file_path}: {e}")
            return ""
    
    def scan_directory(self, directory: str) -> List[Dict]:
        """Recursively scan directory for application files"""
        files = []
        directory_path = Path(directory)
        
        if not directory_path.exists():
            logger.error(f"Directory does not exist: {directory}")
            return files
        
        logger.info(f"Scanning directory: {directory}")
        
        for file_path in directory_path.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in self.app_extensions:
                try:
                    file_hash = self.calculate_file_hash(str(file_path))
                    if file_hash:
                        file_info = {
                            'path': str(file_path),
                            'name': file_path.name,
                            'size': file_path.stat().st_size,
                            'hash': file_hash,
                            'extension': file_path.suffix.lower()
                        }
                        files.append(file_info)
                        logger.debug(f"Found app file: {file_path}")
                except Exception as e:
                    logger.error(f"Error processing file {file_path}: {e}")
        
        logger.info(f"Found {len(files)} application files")
        self.scanned_files = files
        return files
    
    def find_duplicates(self, files: List[Dict]) -> List[Dict]:
        """Find duplicate files based on hash"""
        hash_groups = {}
        
        for file_info in files:
            file_hash = file_info['hash']
            if file_hash not in hash_groups:
                hash_groups[file_hash] = []
            hash_groups[file_hash].append(file_info)
        
        duplicate_groups = []
        for file_hash, group_files in hash_groups.items():
            if len(group_files) > 1:
                duplicate_groups.append({
                    'hash': file_hash,
                    'files': group_files,
                    'size': group_files[0]['size']
                })
        
        logger.info(f"Found {len(duplicate_groups)} duplicate groups")
        self.duplicate_groups = duplicate_groups
        return duplicate_groups
    
    def load_rules(self) -> List[Dict]:
        """Load categorization rules from JSON file"""
        rules_file = self.config['rules_file']
        
        default_rules = [
            {
                'category': 'Developer Tools',
                'keywords': ['code', 'studio', 'dev', 'git', 'npm', 'node', 'python', 'java', 'ide'],
                'path_patterns': ['/Developer', '/Applications/Developer', 'Program Files/Microsoft Visual Studio'],
                'enabled': True
            },
            {
                'category': 'Productivity',
                'keywords': ['office', 'word', 'excel', 'powerpoint', 'notes', 'calendar', 'mail'],
                'path_patterns': ['/Applications/Office', 'Program Files/Microsoft Office'],
                'enabled': True
            },
            {
                'category': 'Entertainment',
                'keywords': ['game', 'media', 'player', 'music', 'video', 'steam'],
                'path_patterns': ['/Games', '/Applications/Games', 'Program Files/Steam'],
                'enabled': True
            },
            {
                'category': 'System Utilities',
                'keywords': ['system', 'utility', 'cleaner', 'monitor', 'backup'],
                'path_patterns': ['/System', '/usr/bin'],
                'enabled': True
            }
        ]
        
        if os.path.exists(rules_file):
            try:
                with open(rules_file, 'r') as f:       
                    data = json.load(f)
                    return data.get('rules', default_rules)
            except Exception as e:
                logger.error(f"Error loading rules from {rules_file}: {e}")
        
        # Create default rules file
        try:
            os.makedirs(os.path.dirname(rules_file), exist_ok=True)
            with open(rules_file, 'w') as f:
                json.dump({'rules': default_rules}, f, indent=2)
            logger.info(f"Created default rules file: {rules_file}")
        except Exception as e:
            logger.error(f"Error creating rules file: {e}")
        
        return default_rules
    
    def categorize_files(self, files: List[Dict]) -> Dict[str, List[Dict]]:
        """Categorize files based on rules"""
        rules = self.load_rules()
        categorized = {}
        uncategorized = []
        
        for file_info in files:
            assigned = False
            file_name = file_info['name'].lower()
            file_path = file_info['path'].lower()
            
            for rule in rules:
                if not rule.get('enabled', True):
                    continue
                
                # Check keywords
                keywords_match = any(keyword.lower() in file_name for keyword in rule.get('keywords', []))
                
                # Check path patterns
                path_match = any(pattern.lower() in file_path for pattern in rule.get('path_patterns', []))
                
                if keywords_match or path_match:
                    category = rule['category']
                    if category not in categorized:
                        categorized[category] = []
                    categorized[category].append({**file_info, 'category': category})
                    assigned = True
                    break
            
            if not assigned:
                uncategorized.append({**file_info, 'category': 'Uncategorized'})
        
        if uncategorized:
            categorized['Uncategorized'] = uncategorized
        
        logger.info(f"Categorized files into {len(categorized)} categories")
        self.categorized_files = categorized
        return categorized
    
    def delete_duplicates(self, file_paths: List[str]) -> Dict:
        """Delete specified duplicate files"""
        deleted_count = 0
        errors = []
        
        if self.config['dry_run']:
            logger.info("DRY RUN: Would delete the following files:")
            for file_path in file_paths:
                logger.info(f"  - {file_path}")
            return {'deleted_count': len(file_paths), 'errors': [], 'dry_run': True}
        
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    deleted_count += 1
                    logger.info(f"Deleted: {file_path}")
                else:
                    errors.append(f"File not found: {file_path}")
            except Exception as e:
                error_msg = f"Failed to delete {file_path}: {str(e)}"
                errors.append(error_msg)
                logger.error(error_msg)
        
        return {'deleted_count': deleted_count, 'errors': errors, 'dry_run': False}
    
    def organize_files(self) -> Dict:
        """Organize files into output directory by category"""
        output_dir = Path(self.config['output_directory'])
        organized_count = 0
        errors = []
        
        if self.config['dry_run']:
            logger.info("DRY RUN: Would organize files into:")
            for category in self.categorized_files.keys():
                category_dir = output_dir / category.replace(' ', '_')
                logger.info(f"  - {category_dir}")
            return {'organized_count': sum(len(files) for files in self.categorized_files.values()), 'errors': [], 'dry_run': True}
        
        try:
            output_dir.mkdir(parents=True, exist_ok=True)
            
            for category, files in self.categorized_files.items():
                category_dir = output_dir / category.replace(' ', '_')
                category_dir.mkdir(exist_ok=True)
                
                for file_info in files:
                    try:
                        source_path = Path(file_info['path'])
                        dest_path = category_dir / source_path.name
                        
                        # Copy file (preserve original)
                        import shutil
                        shutil.copy2(source_path, dest_path)
                        organized_count += 1
                        logger.info(f"Organized: {source_path} -> {dest_path}")
                        
                    except Exception as e:
                        error_msg = f"Failed to organize {file_info['path']}: {str(e)}"
                        errors.append(error_msg)
                        logger.error(error_msg)
            
        except Exception as e:
            error_msg = f"Failed to create output directory: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        return {'organized_count': organized_count, 'errors': errors, 'dry_run': False}
    
    def generate_reports(self) -> Dict:
        """Generate JSON and CSV reports"""
        timestamp = datetime.now().isoformat()
        
        # JSON Report
        json_report = {
            'timestamp': timestamp,
            'summary': {
                'total_files': len(self.scanned_files),
                'duplicate_groups': len(self.duplicate_groups),
                'categories': len(self.categorized_files)
            },
            'scanned_files': self.scanned_files,
            'duplicate_groups': self.duplicate_groups,
            'categorized_files': self.categorized_files
        }
        
        try:
            with open('report.json', 'w') as f:
                json.dump(json_report, f, indent=2)
            logger.info("Generated report.json")
        except Exception as e:
            logger.error(f"Failed to generate JSON report: {e}")
        
        # CSV Report
        try:
            with open('report.csv', 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['File Name', 'Path', 'Hash', 'Category', 'Size (MB)'])
                
                for category, files in self.categorized_files.items():
                    for file_info in files:
                        size_mb = file_info['size'] / (1024 * 1024)
                        writer.writerow([
                            file_info['name'],
                            file_info['path'],
                            file_info['hash'],
                            category,
                            f"{size_mb:.2f}"
                        ])
            
            logger.info("Generated report.csv")
        except Exception as e:
            logger.error(f"Failed to generate CSV report: {e}")
        
        return json_report

def main():
    parser = argparse.ArgumentParser(description='Intelligent Application Management System CLI')
    parser.add_argument('--directory', '-d', required=True, help='Directory to scan')
    parser.add_argument('--config', '-c', help='Configuration file path')
    parser.add_argument('--dry-run', action='store_true', help='Perform dry run without making changes')
    parser.add_argument('--organize', action='store_true', help='Organize files into categories')
    parser.add_argument('--delete-duplicates', help='Comma-separated list of file indices to delete')
    parser.add_argument('--output-dir', help='Output directory for organized files')
    parser.add_argument('--verbose', '-v', action='store_true', help='Enable verbose logging')
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Initialize app manager
    app_manager = AppManager(args.config)
    
    # Override config with command line arguments
    if args.dry_run:
        app_manager.config['dry_run'] = True
    if args.output_dir:
        app_manager.config['output_directory'] = args.output_dir
    
    try:
        # Scan directory
        files = app_manager.scan_directory(args.directory)
        if not files:
            logger.warning("No application files found")
            return
        
        # Find duplicates
        duplicates = app_manager.find_duplicates(files)
        
        # Categorize files
        categorized = app_manager.categorize_files(files)
        
        # Display results
        print(f"\n=== SCAN RESULTS ===")
        print(f"Total files found: {len(files)}")
        print(f"Duplicate groups: {len(duplicates)}")
        print(f"Categories: {len(categorized)}")
        
        if duplicates:
            print(f"\n=== DUPLICATE GROUPS ===")
            for i, group in enumerate(duplicates):
                print(f"\nGroup {i + 1} (Hash: {group['hash'][:8]}...):")
                for j, file_info in enumerate(group['files']):
                    print(f"  {j + 1}. {file_info['name']} ({file_info['path']})")
        
        # Handle duplicate deletion
        if args.delete_duplicates:
            indices = [int(x.strip()) for x in args.delete_duplicates.split(',')]
            files_to_delete = []
            
            for group_idx, file_idx in enumerate(indices):
                if group_idx < len(duplicates) and file_idx <= len(duplicates[group_idx]['files']):
                    file_path = duplicates[group_idx]['files'][file_idx - 1]['path']
                    files_to_delete.append(file_path)
            
            if files_to_delete:
                result = app_manager.delete_duplicates(files_to_delete)
                print(f"\nDeleted {result['deleted_count']} files")
                if result['errors']:
                    print("Errors:")
                    for error in result['errors']:
                        print(f"  - {error}")
        
        # Organize files if requested
        if args.organize:
            result = app_manager.organize_files()
            print(f"\nOrganized {result['organized_count']} files")
            if result['errors']:
                print("Errors:")
                for error in result['errors']:
                    print(f"  - {error}")
        
        # Generate reports
        app_manager.generate_reports()
        print(f"\nReports generated: report.json, report.csv")
        
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
