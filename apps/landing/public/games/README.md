# Game Logos

**Note:** The games showcase component now fetches game icons from the Rekon API (`/api/games/icons`), which pulls official icons from Polymarket's API. This directory is kept for reference or manual fallback assets.

## Current Implementation

The component automatically fetches icons from:
- **API Endpoint**: `/api/games/icons` 
- **Source**: Polymarket's official game icons via Gamma API
- **Fallback**: If API fails, component shows a colored indicator

## File Naming Convention (for manual fallback)

If you need to add manual fallback assets:
- `cs2.svg` - Counter-Strike 2
- `lol.svg` - League of Legends
- `dota2.svg` - Dota 2
- `valorant.svg` - Valorant
- `cod.svg` - Call of Duty
- `r6.svg` - Rainbow Six Siege
- `hok.svg` - Honor of Kings

## Best Practices for Getting Logos (if needed for manual fallback)

### 1. Official Press Kits (Recommended)
Download official logos from game publishers' press/media kits:

- **Valve (CS2, Dota 2)**: https://www.valvesoftware.com/en/about
- **Riot Games (LoL, Valorant)**: https://www.riotgames.com/en/press
- **Ubisoft (Rainbow Six)**: https://www.ubisoft.com/en-us/company/press
- **Activision (CoD)**: Check their media center
- **Tencent (Honor of Kings)**: Check their official website

### 2. Format Requirements
- **Preferred**: SVG format (scalable, small file size)
- **Alternative**: PNG with transparent background (high resolution, optimized)
- **Size**: 48x48px to 64x64px display size (use 2x for retina: 96x96px to 128x128px)
- **Optimization**: Compress images using tools like TinyPNG or Squoosh

### 3. Legal Considerations
- ✅ Use official press kit assets (usually allowed for promotional use)
- ✅ Follow brand guidelines provided by publishers
- ✅ Ensure proper licensing/permissions for commercial use
- ❌ Don't use copyrighted logos without permission
- ❌ Don't modify official logos beyond allowed guidelines

### 4. Fallback Behavior
If a logo file doesn't exist, the component will automatically fall back to:
- A colored dot indicator (using the game's theme color)
- The game's short name text

## How It Works

1. **Primary Source**: Component fetches icons from `/api/games/icons` endpoint
2. **API Source**: Backend fetches from Polymarket's `/sports` Gamma API
3. **Fallback Chain**:
   - If API returns icon → displays Polymarket icon
   - If API fails → uses static file from this directory (if exists)
   - If no static file → shows colored indicator with game's theme color

## Adding Manual Fallback Logos (Optional)

If you want to add manual fallback assets:
1. Download or create logo files
2. Optimize them (SVG preferred, or compressed PNG)
3. Place them in this directory with the correct filename
4. Component will use them if API fails

## Current Display

- **Grid Cards**: 48x48px logos, centered above game name
- **Active Game Details**: 56x56px logo next to game name
- **Error Handling**: Automatically falls back through the chain if logo fails to load

