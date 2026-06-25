# HoneyGold Starter — Google + Cognito (step 2)

Step 1 (Google Cloud OAuth) is done on your side. Step 2 is **Amazon Cognito** with Google as an identity provider. Do **not** send client secrets in chat or email.

## What gets deployed

| Stack | Purpose |
|-------|---------|
| `HoneyGoldCognitoStarterStack` | User pool, Google IdP, Hosted UI domain, web app client |
| `HoneyGoldProvisioningControlStack` | `POST /v1/accounts/enroll` with verified Cognito ID tokens |

## Run step 2 locally

From `HoneyGold/infra/aws/cdk`:

1. Copy `.env.cognito.local.example` → `.env.cognito.local` and fill in your Google **Web client** ID and secret (from step 1).

2. In Google Cloud Console → OAuth client → **Authorized redirect URIs**, add the URI Cognito will print after deploy (format):

   `https://<cognito-domain-prefix>.auth.<region>.amazoncognito.com/oauth2/idpresponse`

   The deploy script prints `GoogleRedirectUriForConsole` when finished.

3. Deploy:

   ```bash
   chmod +x scripts/deploy-cognito-starter.sh
   ./scripts/deploy-cognito-starter.sh
   ```

   Or store credentials in Secrets Manager JSON `{"clientId":"...","clientSecret":"..."}` under `honeygold/google-oauth` and run the same script (it loads from AWS if `.env` is empty).

4. Copy CDK outputs into `honeygold-signin.html`:

   - `window.HG_COGNITO_DOMAIN` = **CognitoHostedUiUrl** (no trailing slash)
   - `window.HG_COGNITO_CLIENT_ID` = **CognitoUserPoolClientId** (Cognito app client, not the Google client ID)

5. Publish the marketing site and test **Continue with Google** on `/honeygold-signin.html`.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Load failed / no redirect | `HG_COGNITO_*` still empty on the sign-in page |
| Google redirect_uri_mismatch | Missing Cognito `/oauth2/idpresponse` URI in Google Console |
| Enroll 403 Missing Authentication Token | Control stack not deployed or old API stage |
| Enroll 401 invalid_token | Wrong pool/client on Lambda env; redeploy control stack after Cognito |
| Enroll 503 cognito_not_configured | Control stack deployed without Cognito outputs |
