# Deploy CalBridge su calbridge.algenialab.com

Guida step-by-step per il deploy.

## 1. Connessione SSH

```bash
ssh user@algenialab.com
# oppure
ssh user@ip-del-server
```

## 2. Preparazione Directory

```bash
# Crea directory se non esiste
sudo mkdir -p /var/www/calbridge
sudo chown -R $USER:$USER /var/www/calbridge
cd /var/www/calbridge
```

## 3. Clone Repository

```bash
git clone https://github.com/ltelese/pumble-meeting-scheduler.git .
```

## 4. Installa PM2 (se non presente)

```bash
sudo npm install -g pm2
```

## 5. Crea File .env

```bash
nano .env
```

Copia e incolla questo contenuto (sostituendo i valori):

```env
# Pumble Configuration
PUMBLE_BOT_TOKEN=your_pumble_bot_token_here
PUMBLE_WEBHOOK_URL=https://api.pumble.com/workspaces/67925f810114da1fd32b7516/incomingWebhooks/postMessage/7ziiydD3RFI2IBxLns4PkfUK

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ltelese@gmail.com
SMTP_PASSWORD=txog ytyx tndg dkbs
EMAIL_FROM=Meeting Scheduler <ltelese@gmail.com>

# CalDAV Configuration (optional - puoi lasciare placeholder per ora)
CALDAV_SERVER_URL=https://your-caldav-server.com
CALDAV_USERNAME=your_username
CALDAV_PASSWORD=your_password
CALDAV_CALENDAR_URL=https://your-caldav-server.com/calendar.ics

# Application
APP_NAME=CalBridge
TIMEZONE=Europe/Rome
PORT=3000
```

Salva con `CTRL+X`, poi `Y`, poi `ENTER`.

## 6. Build e Avvio

```bash
# Installa dipendenze
npm install

# Build TypeScript
npm run build

# Avvia con PM2
pm2 start npm --name "calbridge" -- start

# Salva configurazione PM2
pm2 save

# Configura avvio automatico al boot
pm2 startup systemd
# (Se ti mostra un comando da eseguire, copialo ed eseguilo con sudo)
```

## 7. Verifica Funzionamento

```bash
# Status
pm2 status

# Logs in tempo reale
pm2 logs calbridge

# Test locale
curl http://localhost:3000/health
```

Dovresti vedere: `{"status":"ok","service":"CalBridge"}`

## 8. Configura Apache

### A. Abilita moduli necessari (se non già fatto)

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod rewrite
```

### B. Trova path certificati SSL

```bash
# Se usi Let's Encrypt:
sudo ls -la /etc/letsencrypt/live/

# Se usi altri certificati:
sudo ls -la /etc/ssl/certs/ | grep algenia
sudo ls -la /etc/ssl/private/ | grep algenia
```

Annota i path esatti dei certificati.

### C. Crea Virtual Host

```bash
sudo nano /etc/apache2/sites-available/calbridge.conf
```

Copia questo contenuto (SOSTITUENDO i path SSL con quelli reali):

```apache
<VirtualHost *:80>
    ServerName calbridge.algenialab.com

    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</VirtualHost>

<VirtualHost *:443>
    ServerName calbridge.algenialab.com

    SSLEngine on
    # SOSTITUISCI CON I PATH REALI:
    SSLCertificateFile /etc/letsencrypt/live/algenialab.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/algenialab.com/privkey.pem

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    ErrorLog ${APACHE_LOG_DIR}/calbridge-error.log
    CustomLog ${APACHE_LOG_DIR}/calbridge-access.log combined
</VirtualHost>
```

Salva con `CTRL+X`, `Y`, `ENTER`.

### D. Test configurazione Apache

```bash
sudo apachectl configtest
```

Se vedi "Syntax OK", procedi.

### E. Abilita sito e riavvia Apache

```bash
sudo a2ensite calbridge.conf
sudo systemctl reload apache2
```

## 9. Test Finale

Apri nel browser:
```
https://calbridge.algenialab.com
```

Dovresti vedere l'interfaccia CalBridge!

## 10. Comandi Utili

```bash
# View logs applicazione
pm2 logs calbridge

# Restart applicazione
pm2 restart calbridge

# View logs Apache
sudo tail -f /var/log/apache2/calbridge-error.log
sudo tail -f /var/log/apache2/calbridge-access.log

# Status PM2
pm2 status

# Update da GitHub
cd /var/www/calbridge
git pull
npm install
npm run build
pm2 restart calbridge
```

## Troubleshooting

### Applicazione non parte

```bash
cd /var/www/calbridge
pm2 logs calbridge --err
```

### Apache dà errore SSL

Verifica path certificati:
```bash
sudo apachectl configtest
```

### Porta 3000 non in ascolto

```bash
sudo netstat -tulpn | grep 3000
```

Se non vedi nulla, l'applicazione non è partita. Controlla i log PM2.

## Completato!

Una volta che vedi l'interfaccia su https://calbridge.algenialab.com, passa allo step successivo: aggiornare il manifest.json con il nuovo URL.
