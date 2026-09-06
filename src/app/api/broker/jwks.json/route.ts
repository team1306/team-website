import jwk from '../../../../../broker-public-jwk.json';
 
export async function GET() {
  return Response.json(jwk);
}