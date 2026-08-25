"""
Telegram User Account Upload
Uses your Telegram account to upload APK files directly
"""
import sys
import os
import json
from pathlib import Path
from datetime import datetime

try:
    from telethon import TelegramClient
    from telethon.sync import TelegramClient as SyncClient
except ImportError:
    print("ERROR: telethon not installed!")
    print("Please install: pip install telethon")
    sys.exit(1)

# Config
root = Path(__file__).parent
config_path = root / '.telegram_user_config'

# Load config
if not config_path.exists():
    print("ERROR: .telegram_user_config not found!")
    print("")
    print("Create .telegram_user_config with:")
    print("{")
    print('  "api_id": "YOUR_API_ID",')
    print('  "api_hash": "YOUR_API_HASH",')
    print('  "phone": "+1234567890",')
    print('  "chat_id": "-1003811619173"')
    print("}")
    print("")
    print("Get API credentials from: https://my.telegram.org/apps")
    sys.exit(1)

with open(config_path) as f:
    config = json.load(f)

api_id = config['api_id']
api_hash = config['api_hash']
phone = config['phone']
chat_id = int(config['chat_id'])

# Find APK
apk_dir = root / 'android' / 'app' / 'build' / 'outputs' / 'apk' / 'debug'
if not apk_dir.exists():
    print(f"ERROR: APK directory not found: {apk_dir}")
    sys.exit(1)

apk_files = list(apk_dir.glob('*.apk'))
if not apk_files:
    print("ERROR: No APK files found!")
    sys.exit(1)

apk_file = max(apk_files, key=lambda p: p.stat().st_mtime)
apk_size_mb = apk_file.stat().st_size / (1024 * 1024)
apk_date = datetime.fromtimestamp(apk_file.stat().st_mtime).strftime('%b %d, %Y - %I:%M%p')

print(f"Found APK: {apk_file.name}")
print(f"  Size: {apk_size_mb:.2f} MB")
print(f"  Modified: {apk_date}")
print("")
print("Uploading to Telegram...")

# Upload using user account
with SyncClient('faiora_session', api_id, api_hash) as client:
    # Login (will ask for code on first run)
    client.start(phone=phone)
    
    # Send file
    caption = f"Faiora APK - {apk_date}"
    client.send_file(
        chat_id,
        str(apk_file),
        caption=caption
    )
    
    print("")
    print("✓ Upload successful!")
    print(f"Sent to chat: {chat_id}")
