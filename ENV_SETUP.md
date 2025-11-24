# Environment Setup for Enoki Integration

This project uses Enoki for Google authentication. You need to set up the following environment variables.

## Required Environment Variables

Create a `.env` file in the root of the project with the following variables:

```env
# Enoki Configuration
# Get your Enoki API key from: https://portal.enoki.mystenlabs.com/
# Public API key for wallet registration (used in frontend)
VITE_ENOKI_API_KEY=your_enoki_api_key_here

# Enoki Private API Key (optional, for sponsored transactions)
# WARNING: In production, this should be kept on a backend server, not in frontend code
# This is only for development/testing. See Enoki docs for sponsored transactions setup.
# VITE_ENOKI_PRIVATE_API_KEY=your_enoki_private_api_key_here

# Google OAuth Configuration
# Get your Google Client ID from: https://console.cloud.google.com/apis/credentials
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here

# Sui Network (testnet, mainnet, or devnet)
VITE_SUI_NETWORK=testnet

# Sui Package ID for MedLock smart contract
# This is the package ID of your deployed MedLock contract
# Format: 0x... (hex address)
VITE_SUI_PACKAGE_ID=your_package_id_here

# Seal Key Server Object IDs (optional, comma-separated)
# If not provided, the app will use getAllowlistedKeyServers() to get default key servers for the network
# Only set this if you want to use custom key servers
# VITE_SEAL_SERVER_IDS=0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75,0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8
```

## Getting Your API Keys

### 1. Enoki API Key

1. Visit the [Enoki Portal](https://portal.enoki.mystenlabs.com/)
2. Sign up or log in
3. Create a new API key
4. Copy the public API key and add it to your `.env` file

### 2. Google Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity Services API)
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure the OAuth consent screen if prompted
6. Select "Web application" as the application type
7. **IMPORTANT - Configure Authorized JavaScript origins:**
   - Add `http://localhost:5173` (for local development)
   - Add your production domain (e.g., `https://yourdomain.com`)
   - Do NOT include trailing slashes
8. **IMPORTANT - Configure Authorized redirect URIs:**
   - Add `http://localhost:5173` (for local development)
   - Add your production domain (e.g., `https://yourdomain.com`)
   - Enoki may also require a specific callback URL - check Enoki documentation or your Enoki portal settings
   - The redirect URI must exactly match what Enoki sends in the OAuth request
9. Copy the Client ID and add it to your `.env` file

**Troubleshooting:** If the popup opens but shows your home page instead of Google sign-in:
- Verify both "Authorized JavaScript origins" and "Authorized redirect URIs" include your exact app URL
- Check the browser console for redirect URI mismatch errors
- Ensure there are no trailing slashes in the URLs
- Wait a few minutes after saving changes in Google Cloud Console for them to propagate

## Network Configuration

- `testnet`: For testing (default)
- `mainnet`: For production
- `devnet`: For development

### 3. Sui Package ID

The package ID is the address of your deployed MedLock smart contract on Sui. This is used to:
- Query for patient Profile objects
- Interact with your smart contract functions
- Encrypt/decrypt data with Seal

To get your package ID:
1. Deploy your MedLock smart contract to the Sui network
2. After deployment, copy the package ID from the deployment output
3. Add it to your `.env` file as `VITE_SUI_PACKAGE_ID`

Example: `VITE_SUI_PACKAGE_ID=0x1234567890abcdef1234567890abcdef12345678`

### 4. Seal Key Server IDs (Optional)

Seal key servers are used for encrypting and decrypting patient profile data. 

**By default, the app uses `getAllowlistedKeyServers(network)` to automatically get the official Seal key servers for your network:**
- **Testnet**: Uses Mysten Labs testnet key servers automatically
- **Mainnet/Devnet**: You may need to provide custom key server IDs

To use custom key servers (optional):
1. Visit the Seal documentation or contact Seal key server operators
2. Add comma-separated object IDs to `VITE_SEAL_SERVER_IDS`
3. If not set, the app will use the default allowlisted key servers for your network

Example: `VITE_SEAL_SERVER_IDS=0x73d05d62...,0xf5d14a81...`

**Note**: Your Move contract must include a `seal_approve` function in the `patients` module for Seal encryption to work. See the [Seal documentation](https://seal-docs.wal.app/UsingSeal/) for details.

### 5. Enoki Private API Key (Optional - for Sponsored Transactions)

Enoki sponsored transactions allow you to pay for users' transaction fees. This is useful for improving user experience.

**⚠️ SECURITY WARNING**: The private API key should NEVER be exposed in frontend code in production. It should be kept on a backend server.

For development/testing only:
1. Visit the [Enoki Portal](https://portal.enoki.mystenlabs.com/)
2. Create a **private** API key with "Sponsored Transactions" enabled
3. Add it to your `.env` file as `VITE_ENOKI_PRIVATE_API_KEY` (development only!)

**For Production**: 
- Create a backend API endpoint that uses the private key
- Have your frontend call the backend to create and execute sponsored transactions
- See [Enoki SDK Examples](https://docs.enoki.mystenlabs.com/ts-sdk/examples) for the recommended pattern

**Note**: Currently, Walrus `writeFiles` operations build transactions internally and may not directly support Enoki sponsorship. The EnokiService is available for other on-chain operations that can be sponsored.

## Important Notes

- Never commit your `.env` file to version control
- The `.env` file is already in `.gitignore`
- Restart your development server after changing environment variables

