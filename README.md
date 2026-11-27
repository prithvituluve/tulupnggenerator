# Text to PNG Generator

A responsive text-to-PNG website with a maroon-and-white theme. Write text,
customize its appearance, and download a high-resolution PNG with a transparent
or solid background.

This is a static website: HTML, CSS, vanilla JavaScript, and bundled fonts. It
needs no build step, package installation, API key, or backend.

## Defaults

| Setting | Default |
| --- | --- |
| Text color | Maroon `#741F2B` |
| Interface accents | Maroon `#741F2B` |
| Font family | Mandara |
| Font weight | Regular |
| Font size | 100 px |
| Alignment | Center |
| Line spacing | 1.20× |
| PNG background | Transparent |

Reset Settings restores these defaults without clearing your text.

## Features

- Live PNG preview and automatic image sizing.
- Multiline text, left/center/right alignment, and adjustable line spacing.
- Text and background color pickers.
- Transparent PNG export with resolution adapted to canvas size limits.
- Tulu fonts first in the font menu: Mandara, Kepula, Darage, and Palantulu.
- Kannada-to-keyboard conversion for the bundled Tulu fonts; already-converted
  keyboard input is also accepted.
- Unicode Kannada fonts: Noto Sans Kannada, Noto Serif Kannada, Anek Kannada,
  and Baloo Tamma 2.
- Responsive controls, a mobile preview shortcut, and mobile PNG saving options.
- All fonts are included; no external font service is required.

## Upload to GitHub

1. Extract the ZIP on your computer.
2. Create a repository, or open your existing website repository.
3. Upload the extracted files and the entire `fonts` folder. Keep `index.html`
   at the repository root. Upload the contents of the ZIP, rather than the ZIP
   itself or an extra enclosing folder.
4. Commit the files. For an existing site, replace its old source files with
   these versions.

The required website files are `index.html`, `style.css`, `app.js`, `mapping.js`,
`converter.js`, `icon.svg`, and the complete `fonts` folder. Include `.nojekyll`
when uploading by Git; the `.gitignore` file keeps local clutter out of Git.

### Publish with GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the branch containing these files, usually **main**, and **/(root)**.
4. Save. Once GitHub finishes publishing, open the site URL shown on that page.

Use relative asset paths as supplied so the site also works under a repository
URL such as `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.

[GitHub's publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Preview locally

From the extracted source directory, run:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser. On Windows, `py -m http.server 8000`
can be used when Python is installed through the Python launcher.

## Customize the colors

The theme variables are grouped near the top of `style.css` in `:root`:

```css
--accent: #741f2b;
--accent-hover: #581721;
--accent-soft: #f6e9eb;
--page: #fcfaf9;
```

To change the default exported text color, edit the `value` on
`<input type="color" id="ink" value="#741f2b">` in `index.html`. This same
value is restored by the form's Reset Settings button. The website theme
does not change when someone customizes the color of their exported text.

`index.html` also contains the browser theme-color metadata, and `icon.svg`
contains the favicon color.

## Source files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, controls, and form defaults |
| `style.css` | Theme variables, component styling, and responsive layouts |
| `app.js` | Font loading, live preview, layout, controls, and PNG export |
| `mapping.js` | Kannada character mappings |
| `converter.js` | Kannada-to-font-keyboard conversion |
| `icon.svg` | Maroon favicon |
| `fonts/` | Bundled fonts and their supplied license notices |
| `.nojekyll` | Allows direct static publishing on GitHub Pages |

## Font notes

Keep the supplied font license notices alongside the fonts. Each font retains
its own ownership and license; this package does not change those terms.
Custom font keyboard mappings and browser font fallback can affect how
individual words are displayed, so preview your final text before exporting.

Mobile browsers support PNG download differently. After downloading on a
touch device, use **Open PNG** if needed. **Share PNG** is shown only when the
browser supports sharing image files.
