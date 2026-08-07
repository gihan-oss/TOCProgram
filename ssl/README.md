Place your SSL certificates here:

  fullchain.pem  — certificate chain (server cert + intermediates)
  privkey.pem    — private key (keep secure, never commit)

Generate with Let's Encrypt (certbot) or place manual certificates.

After placing certs, rebuild:
  docker compose up -d --build

Nginx will serve HTTPS on port 443 and redirect HTTP→HTTPS.
