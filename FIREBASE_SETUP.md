# Firebase Setup Guide for Tuutta

## Step-by-Step Firebase Configuration

### 1. Deploy Firestore Security Rules

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **tuutta-f4178**
3. Go to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Copy the content from `firestore.rules` file in your project
6. Paste it into the rules editor
7. Click **Publish**

### 2. Deploy Storage Security Rules

1. In Firebase Console, go to **Storage** in the left sidebar
2. Click on the **Rules** tab
3. Copy the content from `storage.rules` file in your project
4. Paste it into the rules editor
5. Click **Publish**

### 3. Verify Firebase Configuration in .env

Make sure your `.env` file contains:

```env
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Add Your API Keys

You still need to add:

```env
# Get from: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=your-openai-key

# Get from: https://console.cloud.google.com/
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_GOOGLE_CSE_ID=your-google-cse-id
```

### 5. Configure Firebase Functions Secrets (Required for server-side AI)

The Genie AI endpoints run in Firebase Functions and read the OpenAI key from secrets.

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Then deploy:

```bash
firebase deploy --only functions
```

### 5. Initialize Firestore Database

The database will be automatically initialized when users sign up, but you can also:

1. Go to **Firestore Database**
2. Click **Start collection**
3. Collection ID: `users`
4. Click **Next** and **Save**
5. The structure will be created automatically by the app

### 6. Test the Setup

1. Run the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:5173

3. Try to register a new user

4. Check Firebase Console > Authentication to see if the user was created

5. Check Firestore Database > users collection to verify user profile was created

### 7. Database Structure (Auto-created)

When a user registers, the following structure is created:

```
users/
  {userId}/                          # User ID from Firebase Auth
    - email: "user@example.com"
    - name: "username"
    - settings: {...}
    - createdAt: timestamp
    - updatedAt: timestamp

    userData/                        # Subcollection
      data/                          # Single document
        - notes: []
        - chatSessions: []
        - files: []
        - folders: []
        - subjects: []
        - achievements: [...]
        - xp: 0
        - level: {...}
        - streak: {...}
```

### 8. Security Features

✅ **Firestore Rules Enforce:**
- Users can only read/write their own data
- Authentication required for all operations
- No public access to any data

✅ **Storage Rules Enforce:**
- Users can only access their own files
- Maximum file size: 10MB
- Allowed file types: images, PDFs, Word docs, Excel files, text files

### 9. Monitoring

To monitor your database:

1. Go to **Firestore Database** > **Data** tab to view all collections
2. Go to **Authentication** > **Users** to see all registered users
3. Go to **Storage** > **Files** to see uploaded files

### 10. Troubleshooting

**If users can't sign up:**
- Check Authentication is enabled in Firebase Console
- Verify Email/Password provider is enabled
- Check browser console for errors

**If data isn't saving:**
- Verify Firestore rules are deployed
- Check browser console for permission errors
- Ensure user is authenticated before saving data

**If files can't upload:**
- Verify Storage is enabled
- Check Storage rules are deployed
- Ensure file is under 10MB and allowed type

---

## Next Steps

After Firebase is set up:

1. ✅ Configure environment variables
2. ✅ Deploy Firestore rules
3. ✅ Deploy Storage rules
4. 🔄 Get OpenAI API key (for AI features)
5. 🔄 Get Google Search API key (for web search)
6. 🔄 Test user registration and login
7. 🔄 Deploy to production (Netlify/Vercel)

---

**Need Help?** Check the main README.md or open an issue on GitHub.
