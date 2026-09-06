export async function GET() {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const issuer = `${baseUrl}/api/broker`;
   
    const config = {
      issuer,
      authorization_endpoint: `${issuer}/authorize`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      jwks_uri: `${issuer}/jwks.json`,
      response_types_supported: ['code'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'profile'],
      token_endpoint_auth_methods_supported: ['client_secret_post'],
      claims_supported: ['sub', 'name', 'picture', 'given_name', 'family_name'],
    };
   
    return Response.json(config);
  }
   
  