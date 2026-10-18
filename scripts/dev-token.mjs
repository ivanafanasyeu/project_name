import { JwtService } from '@nestjs/jwt';

const isProduction = process.env.NODE_ENV === 'production';
const jwtMode = process.env.JWT_MODE ?? (isProduction ? 'jwks' : 'dev');
if (isProduction || jwtMode !== 'dev') {
	throw new Error('Local token generation requires JWT_MODE=dev outside production');
}

const secret = process.env.JWT_SECRET ?? 'local-development-only-change-me';
const issuer = process.env.JWT_ISSUER ?? 'http://localhost:3000';
const audience = process.env.JWT_AUDIENCE ?? 'project-api';
const clientId = process.env.CLIENT_ID ?? 'local-client';
const scopes = process.env.JWT_SCOPES ?? 'api:read';
const jwtService = new JwtService({
	secret,
	signOptions: {
		algorithm: 'HS256',
		issuer,
		audience,
		expiresIn: 900,
	},
});

const token = await jwtService.signAsync({
	sub: clientId,
	client_id: clientId,
	scope: scopes,
});

console.log(token);
