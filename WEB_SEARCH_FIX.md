# Web Search Fix Guide

## Problem Identified

Web search functionality was not working because of an **environment variable mismatch** between frontend and backend.

### Root Cause

- **Frontend (.env)**: Uses `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CSE_ID`
- **Backend (Netlify Functions)**: Expects `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` (no VITE_ prefix)
- **Result**: Netlify functions couldn't access the API keys, causing all searches to fail

## Solution

### ✅ Step 1: Local Development (COMPLETED)

The `.env` file has been updated with both frontend and backend variables:

```env
# Frontend (Vite)
VITE_GOOGLE_API_KEY=AIzaSyDGAsjRCWpfVsJpX4LFRYiV1nO2qrIZNw4
VITE_GOOGLE_CSE_ID=54035cec2c1914cf0

# Backend (Netlify Functions)
GOOGLE_API_KEY=AIzaSyDGAsjRCWpfVsJpX4LFRYiV1nO2qrIZNw4
GOOGLE_CSE_ID=54035cec2c1914cf0
```

### 🔧 Step 2: Production (Netlify Dashboard) - YOU NEED TO DO THIS

To make web search work in production, add these environment variables to Netlify:

1. **Go to Netlify Dashboard**
   - Visit: https://app.netlify.com/
   - Select your "TuuttaWebApp" site

2. **Navigate to Environment Variables**
   - Click: **Site settings** (in the top navigation)
   - Scroll down and click: **Environment variables** (in the left sidebar)

3. **Add These Two Variables**

   **Variable 1:**
   - Key: `GOOGLE_API_KEY`
   - Value: `AIzaSyDGAsjRCWpfVsJpX4LFRYiV1nO2qrIZNw4`
   - Scopes: Check "All scopes" or at least "Builds" and "Functions"

   **Variable 2:**
   - Key: `GOOGLE_CSE_ID`
   - Value: `54035cec2c1914cf0`
   - Scopes: Check "All scopes" or at least "Builds" and "Functions"

4. **Deploy**
   - Netlify will automatically redeploy your site with the new environment variables
   - Or you can manually trigger a deploy: **Deploys** → **Trigger deploy** → **Deploy site**

## Testing Web Search

### Local Testing (netlify dev)

1. **Stop your current dev server** (if running)

2. **Start Netlify Dev** (this reads .env correctly for functions):
   ```bash
   netlify dev
   ```

3. **Test the search**:
   - Type a question in the chat input
   - Click the **Plus (+)** button
   - Select **"Search Web"** from the dropdown
   - Your query should be searched on Google

4. **Check Console Logs**:
   - Open browser DevTools (F12)
   - Look for these logs:
     ```
     [Google CSE] Attempting search for: your query
     [Google CSE] Response status: 200
     [Google CSE] Found X results
     ```

### Production Testing (After Netlify Setup)

1. **Wait for deployment to complete** (check Netlify dashboard)

2. **Visit your live site**: https://tuutta.netlify.app

3. **Test the same way**:
   - Type a question
   - Click Plus (+) button
   - Select "Search Web"
   - Check browser console for success logs

## How Web Search Works

```
User clicks "Search Web"
    ↓
ChatInterface.tsx calls handleSend(true)
    ↓
openai.ts calls performWebSearch()
    ↓
search.ts tries multiple search providers in order:
    1. Google Custom Search (via /.netlify/functions/searchGoogle)
    2. DuckDuckGo Fast Search (via /.netlify/functions/searchDDG)
    3. DuckDuckGo Full Search (via /.netlify/functions/scrapeAndSearchDDG)
    ↓
Results are formatted and sent to OpenAI for contextualized response
    ↓
Response displayed in chat
```

## Why Previous Fixes Didn't Work

All previous attempts focused on **frontend code** changes, but the issue was in **backend configuration**:

- ❌ Modified search.ts logic
- ❌ Updated ChatInterface.tsx
- ❌ Changed openai.ts integration
- ✅ **The real issue**: Missing environment variables for serverless functions

## Common Issues & Solutions

### Issue: "Google Search is not configured on the server"

**Solution**: Environment variables not set in Netlify dashboard
- Follow Step 2 above to add them

### Issue: Search works locally but not in production

**Solution**: Local .env file doesn't affect production
- Must add variables to Netlify dashboard (Step 2)

### Issue: "API quota exceeded"

**Solution**: Google Custom Search has a daily limit (100 queries/day on free tier)
- System automatically falls back to DuckDuckGo
- Consider upgrading Google CSE if needed

### Issue: Search still not working after Netlify setup

**Checklist**:
1. ✅ Variables added to Netlify dashboard?
2. ✅ Variable names exact: `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` (no typos)?
3. ✅ Values copied correctly (no extra spaces)?
4. ✅ Site redeployed after adding variables?
5. ✅ Check Netlify Functions logs in dashboard for errors

## Additional Notes

- **API Key Security**: The Google API key is safe to expose as it's restricted by domain
- **Rate Limits**: Free tier = 100 queries/day per Google CSE
- **Fallback System**: If Google fails, DuckDuckGo searches automatically kick in
- **Local Testing**: Always use `netlify dev` instead of `npm run dev` to test functions

## Files Modified

1. ✅ `.env` - Added backend environment variables
2. ℹ️ All code was already correct, just missing config!

## Contact

If you still have issues after following this guide, check:
- Netlify Function logs: Dashboard → Functions → Select function → View logs
- Browser console for detailed error messages
- Network tab to see which API calls are failing
