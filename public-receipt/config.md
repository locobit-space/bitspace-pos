# Copy files to server

scp -r public-receipt/\* user@server:/var/www/receipt.bnos.space/

# Link nginx config

sudo ln -s /var/www/receipt.bnos.space/nginx.conf /etc/nginx/sites-enabled/receipt.bnos.space

# Get SSL certificate

sudo certbot certonly --nginx -d receipt.bnos.space

# Reload nginx

sudo nginx -t && sudo systemctl reload nginx
