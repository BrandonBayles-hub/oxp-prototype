# Run the app

1. **Install dependencies** (if you haven’t):
   ```bash
   npm install
   ```

2. **Start the dev server**:
   ```bash
   npm run dev
   ```

3. **Open in your browser**  
   When the server is ready you’ll see something like:
   ```text
   - Local:   http://localhost:3000
   ```
   Open that URL (e.g. **http://localhost:3000**).

4. **If the port is in use**  
   Next.js will use the next free port (e.g. 3001, 3002, 3003). **Use the URL shown in the terminal** (e.g. `http://127.0.0.1:3003`). Then open `/getting-started` (or just `/`) on that port.

---

## Recurring issue: blank screen or “can’t see the app”

This project has had **stale/corrupt Next.js cache** issues. If the app is blank, shows errors in the terminal (e.g. `Cannot find module './888.js'`, `SegmentViewNode`, `__webpack_modules__[moduleId] is not a function`), or hot reload acts weird:

1. **Stop the dev server** (Ctrl+C in the terminal).

2. **Clear the cache and start clean**:
   ```bash
   npm run dev:clean
   ```
   This deletes the `.next` folder and starts the dev server so the first load is a full rebuild.

3. **If you don’t use the script**, do it manually:
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **Then open the URL** from the terminal (e.g. http://localhost:3000) in your browser.

5. **Still blank** – Open DevTools (F12) → **Console** for errors. Try **/getting-started** or **/command-center** on the same port. Crashes show "Something went wrong" in the UI.

---

## After UI changes: how to see them (and keep the app stable)

This app’s dev setup can feel unstable: you change the UI but don’t see it, or things bug out. Use this **every time** you (or someone) has made UI changes and you want to see them:

1. **Stop the dev server**  
   In the terminal where it’s running: **Ctrl+C**.

2. **Clean and start**  
   ```bash
   npm run dev:clean
   ```  
   Wait until you see **Ready** and the **Local:** URL.

3. **One tab, exact URL**  
   Open a **new** browser tab and go to **exactly** the URL from the terminal (e.g. `http://127.0.0.1:3000`). Close other tabs that had the app open on other ports.

4. **Hard refresh**  
   **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows). That forces the browser to load the new JS/CSS instead of cache.

If you skip this and just refresh, you may keep seeing the old UI or hit weird behavior. Doing these four steps after each round of UI work is the most reliable way to keep things stable and see your changes.
