# Google Cloud Platform Setup for Orbit

## Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click **Select a project** (top bar) > **New Project**
3. Name: `Orbit CRM`
4. Click **Create**

## Step 2: Enable APIs

In your new project, go to **APIs & Services > Library** and enable:

1. **Gmail API** — search "Gmail API" > click > **Enable**
2. **Google People API** — search "People API" > click > **Enable**
3. **Google Calendar API** — search "Calendar API" > click > **Enable**

## Step 3: Configure OAuth Consent Screen

Go to **APIs & Services > OAuth consent screen**:

1. Select **External** user type > **Create**
2. Fill in:
   - App name: `Orbit by SpaceKayak`
   - User support email: `p@spacekayak.xyz`
   - Developer contact email: `p@spacekayak.xyz`
3. Click **Save and Continue**
4. On **Scopes** page, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/contacts.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
5. Click **Save and Continue**
6. On **Test users** page, click **Add Users** and add: `p@spacekayak.xyz`
7. Click **Save and Continue** > **Back to Dashboard**

## Step 4: Create OAuth Credentials

Go to **APIs & Services > Credentials**:

1. Click **Create Credentials** > **OAuth client ID**
2. Application type: **Web application**
3. Name: `Orbit Local`
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/api/auth/callback
   ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 5: Configure Orbit

Open `/Users/pluto/Claude-Workspace/orbit/.env.local` and paste your credentials:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
GOOGLE_USER_EMAIL=p@spacekayak.xyz
```

## Step 6: Connect in Orbit

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/settings`
3. Click **Connect Google Account**
4. Authorize with your Google account
5. You'll be redirected back with a success message

## Notes

- The app is in **test mode** — only the test user (p@spacekayak.xyz) can authorize
- To allow other users, you'd need to submit for Google verification
- Tokens are stored locally in the SQLite database, not sent anywhere
