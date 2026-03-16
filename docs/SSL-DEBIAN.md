# Native TLS on Debian with Certbot

Use **Certbot** to provision Let's Encrypt certificates as files, then run the app with the uWS adapter's native TLS (`SSL_CERT` / `SSL_KEY`). No proxy required.

## 0. Fix “unable to resolve host” when using sudo

If you see `sudo: unable to resolve host draft: Name or service not known` (or another hostname), your machine’s hostname is not in `/etc/hosts`. Add it:

```bash
# See your hostname
hostname

# Add it next to 127.0.0.1 (use your actual hostname instead of 'draft' if different)
echo '127.0.0.1 draft' | sudo tee -a /etc/hosts
```

If `/etc/hosts` already has a line like `127.0.1.1 draft`, ensure the hostname from `hostname` matches one of those entries. Then `sudo` should work without that error.

## 1. Allow binding to port 443s

Either allow unprivileged binding (recommended) or run the app as root.

**Option A – Unprivileged port 443 (recommended)**

```bash
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0
# Make permanent:
echo 'net.ipv4.ip_unprivileged_port_start=0' | sudo tee -a /etc/sysctl.d/99-unprivileged-ports.conf
sudo sysctl --system
```

**Option B – Give Node permission to bind 443**

```bash
sudo setcap cap_net_bind_service=+ep $(readlink -f $(which node))
```

## 2. Install Certbot

```bash
sudo apt update
sudo apt install certbot
```

## 3. Obtain a certificate

**If nothing is using port 80** (e.g. first-time setup):

```bash
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com --agree-tos -m you@example.com
```

**If port 80 is already in use** (e.g. nginx), use webroot:

```bash
# Certbot will use /var/www/html for the challenge. Ensure that path is served by your web server.
sudo certbot certonly --webroot -w /var/www/html -d yourdomain.com -d www.yourdomain.com --agree-tos -m you@example.com
```

Certificates and keys are stored under `/etc/letsencrypt/live/<domain>/`:

- **Certificate:** `fullchain.pem`
- **Private key:** `privkey.pem`

## 4. Let the app read the key

Certbot’s live dir is root-only. Either run the app as root (not ideal) or make the key readable by your app user.

**Option A – Run app as root**  
Use only if you must; prefer Option B.

**Option B – Group + permissions (recommended)**

```bash
# Create a group for cert access
sudo groupadd ssl-cert-read 2>/dev/null || true
sudo usermod -aG ssl-cert-read YOUR_APP_USER

# Give the group read access to the live directory for your domain
sudo chgrp -R ssl-cert-read /etc/letsencrypt/live/yourdomain.com
sudo chmod -R g+rX /etc/letsencrypt/live/yourdomain.com
sudo chgrp -R ssl-cert-read /etc/letsencrypt/archive/yourdomain.com
sudo chmod -R g+rX /etc/letsencrypt/archive/yourdomain.com
```

Replace `YOUR_APP_USER` and `yourdomain.com` with your user and domain. After renewal, Certbot updates files under `archive/` and symlinks in `live/`; the group permissions above keep access working.

## 5. Set environment variables

In your `.env` or systemd unit:

```bash
SSL_CERT=/etc/letsencrypt/live/draftem.net/fullchain.pem SSL_KEY=/etc/letsencrypt/live/draftem.net/privkey.pem PORT=443
ORIGIN=https://yourdomain.com
```

Then start the app (e.g. `npm run start` or your systemd service). It will serve HTTPS directly with the uWS adapter.

## 6. Auto-renewal and reloading certs

Certbot installs a systemd timer (or cron) that runs `certbot renew`. After renewal, the **same paths** still point at the new certs, but the app has to reload them. The uWS adapter does not hot-reload certs, so **restart the app** after each renewal.

**Deploy hook – restart your app after renewal**

Run these commands **one at a time**. Replace `draft-utility` with your actual systemd service name if it’s different.

**How to find your service name**

- List services you’ve created (under `/etc/systemd/system/` or `~/.config/systemd/user/`). Names end with `.service`; the **service name** is the filename without `.service`:
  ```bash
  systemctl list-unit-files --type=service --state=enabled
  ```
  Or list all loaded units:
  ```bash
  systemctl list-units --type=service
  ```
- If you created the unit as `/etc/systemd/system/draft-utility.service`, the service name is **`draft-utility`** (no path, no `.service`).
- To confirm a name works:
  ```bash
  systemctl status draft-utility
  ```
  If you see “loaded” and “active” (or “inactive”), the name is correct. If you see “not found”, the service doesn’t exist or the name is wrong.

**Step 6a – Create the directory for deploy hooks**

```bash
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
```

- `mkdir -p`: create the directory and any missing parents.
- Certbot runs scripts in `deploy/` after it successfully renews a certificate.

**Step 6b – Create the script file (first line)**

```bash
echo '#!/bin/sh' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

- Creates the file and writes the shebang line (`#!/bin/sh`) so the system knows to run it with `sh`.
- `tee` writes both to the file and to the terminal; `sudo` is needed because the file is under `/etc/letsencrypt/`.

**Step 6c – Append the restart command to the script**

```bash
echo 'systemctl restart draft-utility' | sudo tee -a /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

- `-a` means append (don’t overwrite the file).
- Replace `draft-utility` with the **exact** name of your systemd service (the one you use in `systemctl start …`). This is the command that will run after each successful renewal.

**Step 6d – Make the script executable**

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

- `chmod +x`: allow the file to be executed. Certbot will run it as a shell script after renewal.

**Check the result**

```bash
cat /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

You should see:

```
#!/bin/sh
systemctl restart draft-utility
```

If the service name or path is wrong, edit the file:

```bash
sudo nano /etc/letsencrypt/renewal-hooks/deploy/restart-app.sh
```

Save (Ctrl+O, Enter) and exit (Ctrl+X).

## 7. Create and enable the systemd service

A template unit file is in the repo at **`deploy/draft-utility.service`**. Use it to run the app at boot and allow the Certbot deploy hook to restart it.

**Step 7a – Decide where the app lives and which user runs it**

- **App directory:** e.g. `/home/deploy/draft-utility` (your built app: `build/`, `node_modules/`, `.env`, etc.).
- **User:** a dedicated user is recommended (e.g. `deploy`). Create one if needed:
  ```bash
  sudo adduser --disabled-password --gecos "" deploy
  ```
  If you use your own username (e.g. `robin`), use that instead of `deploy` below.

**Step 7b – Put the unit file in place**

From your project directory (or wherever you have the repo):

```bash
sudo cp deploy/draft-utility.service /etc/systemd/system/draft-utility.service
```

**Step 7c – Edit the unit file to match your paths and user**

```bash
sudo nano /etc/systemd/system/draft-utility.service
```

Set these to **your** values:

| Line              | Meaning |
|-------------------|--------|
| `User=`           | User that runs the app (e.g. `deploy` or your login). |
| `Group=`          | Usually same as `User` (e.g. `deploy`). |
| `WorkingDirectory=` | **Absolute** path to the app directory (e.g. `/home/app/draft-utility`). Must start with `/`; systemd does not expand `~`. |
| `EnvironmentFile=`  | **Absolute** path to the app’s `.env` (e.g. `/home/app/draft-utility/.env`). |

`ExecStart` can stay as `/usr/bin/node build/index.js` if Node is installed system-wide. To use a specific Node (e.g. from nvm), use the full path: `ExecStart=/home/deploy/.nvm/versions/node/v22.x.x/bin/node build/index.js`.

Save (Ctrl+O, Enter) and exit (Ctrl+X).

**Step 7d – Reload systemd, enable and start the service**

```bash
sudo systemctl daemon-reload
sudo systemctl enable draft-utility
sudo systemctl start draft-utility
```

- `daemon-reload`: load the new/updated unit file.
- `enable`: start the service at boot.
- `start`: start it now.

**Step 7e – Check that it’s running**

```bash
systemctl status draft-utility
```

You should see “active (running)”. If it fails, check:

```bash
journalctl -u draft-utility -n 50 --no-pager
```

Ensure `.env` contains `SSL_CERT`, `SSL_KEY`, `PORT=443`, and `ORIGIN=https://yourdomain.com` (and any other vars the app needs).

**If you see “Failed to load environment files: No such file or directory”**

systemd can’t find the file at `EnvironmentFile=`. Check that the path is **absolute** (starts with `/`) and that the file exists, e.g.:

```bash
ls -la /home/app/draft-utility/.env
```

Fix the path in the unit to match. If you run the app with `node -r dotenv/config build/index.js`, you can instead **remove** the `EnvironmentFile=` line; dotenv will load `.env` from `WorkingDirectory`. Then run `sudo systemctl daemon-reload` and `sudo systemctl start draft-utility`.

**If you see “Failed to spawn … task: No such file or directory”**

systemd can’t find the **executable** in `ExecStart`. The template uses `/usr/bin/node`; if Node is installed elsewhere (e.g. via nvm or NodeSource), use the **full path** to the `node` binary.

As the user that runs the service (e.g. `app`), run:

```bash
which node
```

Use that path in `ExecStart`, for example:

```ini
ExecStart=/home/app/.nvm/versions/node/v22.11.0/bin/node build/index.js
```

Then run `sudo systemctl daemon-reload` and `sudo systemctl start draft-utility` again.

**If you see “Failed with result 'resources'”**

This usually means a **resource limit** (file descriptors, processes) or that systemd couldn’t set up the process (e.g. bad permissions or missing path).

1. **Get more detail** – Often the real error appears a line or two above:
   ```bash
   journalctl -u draft-utility -n 30 --no-pager
   ```
   Look for “Permission denied”, “No such file”, “ENOENT”, “EACCES”, or “cannot change directory”.

2. **Run the app manually as the service user** – Replaces `User=` and paths with your actual user and app path; use the same node path as in `ExecStart`:
   ```bash
   sudo -u app bash -c 'cd /home/app/draft-utility && /home/app/.nvm/versions/node/v22.11.0/bin/node build/index.js'
   ```
   (Use your real user and node path.) Any error you see here (e.g. “Cannot find module”, “EACCES”, “address already in use”) is what’s failing under systemd.

3. **Check paths and permissions** – The service user must be able to read the app dir and `.env`:
   ```bash
   sudo -u app test -r /home/app/draft-utility/.env && echo "OK" || echo "Cannot read .env"
   sudo -u app test -x /home/app/draft-utility/build/index.js && echo "OK" || echo "Cannot run build/index.js"
   ```

4. **Raise resource limits** – The uWS adapter uses worker threads and many file descriptors. Add to your unit under `[Service]` (then `sudo systemctl daemon-reload` and `start` again):
   ```ini
   LimitNOFILE=65536
   LimitNPROC=512
   ```
   The template in `deploy/draft-utility.service` includes these.

## Summary

| Step | Action |
|------|--------|
| 0 | Fix “unable to resolve host” in `/etc/hosts` if needed |
| 1 | Allow port 443 (sysctl or setcap) |
| 2 | `apt install certbot` |
| 3 | `certbot certonly --standalone -d yourdomain.com ...` (or webroot) |
| 4 | Give app user read access to `/etc/letsencrypt/live/yourdomain.com` |
| 5 | Set `SSL_CERT`, `SSL_KEY`, `PORT=443`, `ORIGIN` in `.env` |
| 6 | Add a Certbot deploy hook to restart the app after `certbot renew` |
| 7 | Create and enable the systemd service (`deploy/draft-utility.service`) |

The app then uses native uWS TLS with no reverse proxy.
