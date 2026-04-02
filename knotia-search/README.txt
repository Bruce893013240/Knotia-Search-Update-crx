Knotia AI Search
================

AI-powered semantic search for IFRS / IAS / ASPE accounting standards on Knotia.

Instead of manually browsing the table of contents, type a question in plain
English and the extension highlights the relevant standards, sections, and
paragraphs for you.


INSTALLATION
------------

No Chrome Web Store listing -- load the extension directly from the source folder.

Step 1 -- Enable Developer Mode
  Open chrome://extensions in Chrome.
  Toggle "Developer mode" on (top-right corner).

Step 2 -- Load the extension
  Click "Load unpacked" and select the knotia-search folder.

Step 3 -- Set the keyboard shortcut  *** IMPORTANT ***
  Open chrome://extensions/shortcuts
  Find: Knotia AI Search -> Open Knotia AI Search
  Click the input box and press your shortcut:

    Mac:     Command + Shift + F
    Windows: Ctrl + Shift + F

  Chrome does NOT set this automatically -- you must do it manually.

Step 4 -- Configure your API key
  Click the Knotia extension icon in the toolbar, then Settings.

  - Choose your AI Provider (Anthropic Claude or OpenAI GPT)
  - Select a Model
  - Paste your API Key
  - Click Save Settings
  - Click Test Connection to verify everything works

  Anthropic (Claude): get your key at console.anthropic.com
  OpenAI (GPT):       get your key at platform.openai.com/api-keys


USAGE
-----

1. Open a Knotia standards page (knotia.ca or via your library proxy)
2. Press your shortcut (Command+Shift+F on Mac / Ctrl+Shift+F on Windows)
   -- or click the Knotia icon in the Chrome toolbar
3. Type your question and press Enter

The extension works in three stages:

  Stage 1 -- Standards highlighted
    Relevant top-level standards in the table of contents are highlighted
    in amber. Click one to expand it.

  Stage 2 -- Sections highlighted
    After you expand a standard, the AI re-analyzes and highlights the most
    relevant sub-sections. Click one to open it.

  Stage 3 -- Paragraphs highlighted
    Once the document content loads, relevant passages are highlighted in
    yellow. Use the up/down buttons or Enter / Shift+Enter to jump between them.

Close the search bar: press Esc or click the X button.


UPDATING THE EXTENSION
----------------------

After downloading new code:

1. Go to chrome://extensions
2. Click the refresh button (circular arrow) on the Knotia AI Search card
3. Reload any open Knotia tabs (Command+R on Mac / Ctrl+R on Windows)


SUPPORTED URLS
--------------

The extension activates on:
  - *.knotia.ca/*
  - *.myaccess.library.utoronto.ca/*  (UofT library proxy)


TROUBLESHOOTING
---------------

Search bar doesn't appear
  - Refresh the Knotia tab after installing or updating the extension
  - Check chrome://extensions/shortcuts -- the shortcut must be set manually
  - As a fallback, click the Knotia icon in the Chrome toolbar

"AI error -- check Settings for a valid API key"
  - Open Settings and verify your API key is saved
  - Click Test Connection to confirm the key works

"TOC not found -- are you on a Knotia standards page?"
  - The extension only works on standards pages with a table of contents sidebar
  - Make sure you have navigated to an actual standard, not the Knotia homepage

Test Connection shows CORS error
  - Refresh the extension at chrome://extensions and try again


PRIVACY
-------

Your API key is stored locally in Chrome's extension storage and never leaves
your browser except when making direct API calls to your chosen AI provider
(Anthropic or OpenAI). No data is sent to any third-party servers.
