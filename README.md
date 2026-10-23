# Force Battles

A browser-based Star Wars-inspired tactical battle game with local pass-and-play and online 1v1 multiplayer.

## Publish with GitHub Pages

1. Create a new repository on GitHub (for example, `force-battles`).
2. Upload the **contents** of this folder to the repository root. `index.html` must be at the root, not inside another nested `forcebattles` folder.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/(root)`, then click **Save**.
6. Wait for the Pages deployment to finish. Your site will be published at a URL similar to `https://YOUR-USERNAME.github.io/force-battles/`.
7. Open that HTTPS URL in a modern browser. One player clicks **Create room** and shares the five-character code; the other enters it under **Join room**.

## Important

- Keep the folder structure intact: `css/`, `js/`, `portraits/`, and `icons/` must stay alongside `index.html`.
- GitHub Pages is static hosting. Online play currently uses PeerJS and its public matchmaking server; it does not require a custom Node.js server.
- Peer-to-peer connections may fail on some restrictive networks or firewalls. A self-hosted PeerServer or relay infrastructure may be needed for more reliable connectivity.
- Both players must load the same deployed game version. If the rules or network protocol change, update `NETVER` in `js/net.js` when appropriate.
- Test with two separate browsers/devices. Opening two tabs on the same browser can be useful, but may not represent a real-world connection.

## Local testing

Run a local web server from this folder, for example:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000/`. Localhost is suitable for basic testing, but real online play should be tested from the published HTTPS URL.
