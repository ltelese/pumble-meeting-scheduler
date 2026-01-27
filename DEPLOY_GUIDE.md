# Deploy Guide - Linux Server con Apache

Guida completa per il deploy di CalBridge su server Linux con Apache e SSL.

## Prerequisiti

- Server Linux (Ubuntu/Debian)
- Apache installato
- Certificato SSL configurato
- Accesso SSH al server
- Dominio configurato (es: calbridge.tuodominio.com)

## Step 1: Preparazione Server

Connettiti al server via SSH:

```bash
ssh user@tuoserver.com
```

### Installa Node.js (se non presente)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Verifica installazione
node -v
npm -v
```

### Installa PM2 (process manager)

```bash
sudo npm install -g pm2
```

### Abilita moduli Apache necessari

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod rewrite
sudo systemctl restart apache2
```

## Step 2: Clone Repository

```bash
# Crea directory applicazione
sudo mkdir -p /var/www/calbridge
sudo chown -R $USER:$USER /var/www/calbridge

# Clone repository
cd /var/www/calbridge
git clone https://github.com/ltelese/pumble-meeting-scheduler.git .
```

## Step 3: Configura Variabili d'Ambiente

Crea file `.env`:

```bash
nano .env
```

Inserisci le variabili:

```env
# Pumble Configuration
PUMBLE_BOT_TOKEN=your_pumble_bot_token_here
PUMBLE_WEBHOOK_URL=https://api.pumble.com/workspaces/xxx/incomingWebhooks/postMessage/xxx

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=Meeting Scheduler <your_email@gmail.com>

# CalDAV Configuration (optional)
CALDAV_SERVER_URL=https://your-caldav-server.com
CALDAV_USERNAME=your_username
CALDAV_PASSWORD=your_password
CALDAV_CALENDAR_URL=https://your-caldav-server.com/calendar.ics

# Application Configuration
APP_NAME=CalBridge
TIMEZONE=Europe/Rome
PORT=3000
```

Salva con `CTRL+X`, poi `Y`, poi `ENTER`.

## Step 4: Build e Avvio Applicazione

```bash
# Installa dipendenze
npm install

# Build TypeScript
npm run build

# Avvia con PM2
pm2 start npm --name "calbridge" -- start

# Salva configurazione PM2
pm2 save

# Configura avvio automatico
pm2 startup systemd
```

Verifica che funzioni:

```bash
pm2 status
pm2 logs calbridge
```

Dovresti vedere "CalBridge running on port 3000".

## Step 5: Configura Apache Virtual Host

Crea file di configurazione Apache:

```bash
sudo nano /etc/apache2/sites-available/calbridge.conf
```

Inserisci (sostituendo `calbridge.tuodominio.com` e i path dei certificati):

```apache
<VirtualHost *:80>
    ServerName calbridge.tuodominio.com

    # Redirect HTTP to HTTPS
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName calbridge.tuodominio.com

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/your/certificate.crt
    SSLCertificateKeyFile /path/to/your/private.key
    SSLCertificateChainFile /path/to/your/ca_bundle.crt

    # Proxy Configuration
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # Logs
    ErrorLog ${APACHE_LOG_DIR}/calbridge-error.log
    CustomLog ${APACHE_LOG_DIR}/calbridge-access.log combined
</VirtualHost>
```

Abilita il sito e riavvia Apache:

```bash
sudo a2ensite calbridge.conf
sudo systemctl reload apache2
```

## Step 6: Test

Apri nel browser:

```
https://calbridge.tuodominio.com
```

Dovresti vedere l'interfaccia CalBridge!

## Step 7: Aggiorna Manifest

Aggiorna `manifest.json` con i nuovi URL:

```json
{
  "shortcuts": [
    {
      "url": "https://calbridge.tuodominio.com/shortcuts/message",
      ...
    }
  ],
  "slashCommands": [
    {
      "url": "https://calbridge.tuodominio.com/commands/meeting",
      ...
    }
  ],
  "eventSubscriptions": {
    "url": "https://calbridge.tuodominio.com/events",
    ...
  }
}
```

Commit e push:

```bash
git add manifest.json
git commit -m "Update manifest with production URLs"
git push
```

## Comandi Utili

```bash
# Visualizza logs
pm2 logs calbridge

# Riavvia applicazione
pm2 restart calbridge

# Ferma applicazione
pm2 stop calbridge

# Stato applicazione
pm2 status

# Update da GitHub
cd /var/www/calbridge
git pull
npm install
npm run build
pm2 restart calbridge

# View Apache logs
sudo tail -f /var/log/apache2/calbridge-error.log
sudo tail -f /var/log/apache2/calbridge-access.log
```

## Troubleshooting

### Applicazione non parte

```bash
pm2 logs calbridge --err
```

### Apache non riesce a connettersi

Verifica che l'app sia in ascolto:

```bash
sudo netstat -tulpn | grep 3000
```

### Errori SSL

Verifica certificati:

```bash
sudo apachectl -t
```

## Auto-deploy Script

Per semplificare gli aggiornamenti futuri, usa lo script `deploy.sh`:

```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

## Sicurezza

1. **Firewall**: Assicurati che solo le porte 80 e 443 siano aperte
2. **SSL**: Usa certificati validi (Let's Encrypt consigliato)
3. **Variabili d'ambiente**: Non committare mai `.env` su Git
4. **Aggiornamenti**: Mantieni Node.js e dipendenze aggiornate

## Monitoring

Configura monitoring con PM2:

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

Pronto! La tua applicazione è online e sicura! 🎉
