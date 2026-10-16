# Version GitHub Pages de Last Loop : copie du jeu dans un dossier de dépôt, index.html complet
# (doctype, <html lang>, <head> avec viewport et manifeste), Cloudflare Web Analytics avant </body>, sw.js à jour.
import os, shutil, subprocess, sys
SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DST = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/lastloop-gh'
subprocess.run(['python3', os.path.join(os.path.dirname(__file__), 'make_sw.py')], check=True)
os.makedirs(DST, exist_ok=True)
for name in os.listdir(SRC):
    s, d = os.path.join(SRC, name), os.path.join(DST, name)
    if name.startswith('.'): continue
    if os.path.isdir(s):
        if os.path.exists(d): shutil.rmtree(d)
        shutil.copytree(s, d)
    else: shutil.copy2(s, d)
body = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
head_end = body.index('<div id="app">')
head, rest = body[:head_end].strip(), body[head_end:].rstrip()
CF = """<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "cdb82226cd1b401d9e4f4e899f9b8425"}'></script><!-- End Cloudflare Web Analytics -->"""
page = f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="description" content="Un train, une boucle, des survivants : tiens la ligne jusqu'au bout. Jeu de gestion pour mobile, à jouer en paysage.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Last Loop">
<link rel="manifest" href="manifest.webmanifest">
{head}
</head>
<body>
{rest}
{CF}
</body>
</html>
"""
open(os.path.join(DST, 'index.html'), 'w', encoding='utf-8').write(page)
# Pas de mode debug en ligne : ni #debug ni les 7 touchers sur la version
cfg = os.path.join(DST, 'js/data/config.js')
c = open(cfg, encoding='utf-8').read()
assert 'DEBUG_ALLOWED: true' in c
open(cfg, 'w', encoding='utf-8').write(c.replace('DEBUG_ALLOWED: true', 'DEBUG_ALLOWED: false'))
# version.json : lu par le jeu à l'ouverture pour se mettre à jour seul
import re, json
ver = re.search(r"VERSION: '([^']+)'", open(os.path.join(SRC, 'js/data/config.js')).read()).group(1)
json.dump({'v': ver}, open(os.path.join(DST, 'version.json'), 'w'))
print('ok', DST)
