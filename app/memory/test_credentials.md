"# Test Credentials

## Admin Account
- **Email:** admin@example.com
- **Password:** admin123
- **Role:** admin

## Auth Endpoints
- POST `/api/auth/register` — body: `{email, password, name?}`
- POST `/api/auth/login` — body: `{email, password}`
- GET `/api/auth/me` — returns current user (uses httpOnly cookie or Bearer token)
- POST `/api/auth/logout`

## Notes
- JWT issued as `access_token` httpOnly cookie (lax, 12h) and `refresh_token` (7d).
- Frontend must use `withCredentials: true` (axios) for API calls.
- Database: PostgreSQL `billing_studio` on localhost:5432 (user `billing_user`).
"