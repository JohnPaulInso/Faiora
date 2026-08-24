# 📱 Telegram APK Auto-Upload

Automatically upload your APK builds to your private Telegram channel!

## 🚀 Quick Setup

### Step 1: Create a Telegram Bot
1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the instructions
3. Copy your **Bot Token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Step 2: Get Your Channel ID
1. Create a private channel or use an existing one
2. Add your bot as an admin to the channel
3. Get your channel ID using one of these methods:
   - Forward a message from your channel to [@userinfobot](https://t.me/userinfobot)
   - Use the channel username (e.g., `@my_private_channel`)
   - Or use the numeric ID (e.g., `-1001234567890`)

### Step 3: Configure Credentials

**Option A: Create config file (Recommended)**
```bash
# Copy the example file
cp .telegram_config.example .telegram_config

# Edit .telegram_config with your credentials
```

Example `.telegram_config`:
```json
{
  "bot_token": "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz",
  "chat_id": "@my_apk_channel"
}
```

**Option B: Use environment variables**
```powershell
$env:TELEGRAM_BOT_TOKEN = "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
$env:TELEGRAM_CHAT_ID = "@my_apk_channel"
```

## 📦 Usage

### Automatic Upload (after build)
```powershell
.\a.ps1
```
This will:
1. Build your web assets
2. Sync with Android
3. Create the APK
4. **Automatically upload to Telegram** (if configured)

### Manual Upload Only
```powershell
.\upload_telegram.ps1
```
Upload the most recent APK without rebuilding.

## 🔒 Security Notes

- ✅ `.telegram_config` is in `.gitignore` - your credentials won't be committed
- ✅ Use a private channel for security
- ✅ Never share your bot token publicly
- ✅ You can revoke the bot token anytime via @BotFather

## 🎯 What Gets Uploaded

Each upload includes:
- 📦 The APK file
- 📅 Build date/time
- 📊 File size
- 🚀 "Faiora APK Build" caption

## ❓ Troubleshooting

**"Telegram credentials not found"**
- Make sure you've created `.telegram_config` or set environment variables

**"Upload failed with 403"**
- Make sure your bot is added as admin to your channel
- Check that your channel ID is correct

**"Upload failed with 400"**
- Verify your bot token is correct
- Check that the channel ID format is correct (@username or -100xxxxxxxxx)

**APK file not found**
- Build the APK first: `.\a.ps1`
- Check that `android\app\build\outputs\apk\debug\` has APK files

## 🎨 Customization

Edit `upload_telegram.ps1` to customize:
- Caption text format
- Emoji style
- Timeout duration
- Error messages

---

**Made with ❤️ for Faiora**
