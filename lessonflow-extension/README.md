# LessonFlow — Guided Chrome Extension (Stage 2)

**Official Chrome Extension (Manifest V3) for the LessonFlow Teaching Platform**

This extension works alongside your school's existing lesson-planning website. It reads the structured weekly lesson data you prepared and reviewed in LessonFlow, and helps you transfer field values into the school website's form without repetitive copying, pasting, or reopening source PDF documents.

---

## 📌 Core Design Principles

1. **Teacher Remains in Control**: The extension never automatically submits or publishes a lesson plan. It only assists with data entry and stops before the final "Save" or "Submit" button.
2. **Real Data Layer**: Connects directly to your authorized LessonFlow account using a secure personal API Token. No mock data or fake lessons.
3. **Adaptive Field Mapping**: School website forms differ between districts. The extension includes an interactive visual inspector that allows you to click and map fields on your specific school portal.
4. **Three Progressive Modes**:
   - **Mode 1: Copy Only**: 1-click clean plain-text copying (strips HTML and formatting).
   - **Mode 2: Guided Fill**: Fills and verifies one field at a time with visual confirmation.
   - **Mode 3: Fill Mapped Fields**: Fills all mapped fields sequentially, then stops for your manual inspection.

---

## 📁 Extension File Structure

The extension is maintained as an isolated Manifest V3 project in the `lessonflow-extension/` directory:

```text
lessonflow-extension/
├── manifest.json              # Chrome Manifest V3 configuration & permissions
├── background/
│   └── service-worker.js      # Coordinates tab lifecycle and side panel activation
├── content/
│   ├── content-script.js      # Runs in the school website tab: element inspector & verified filler
│   └── content-script.css     # Non-destructive highlighting and floating inspector badge
├── sidepanel/
│   ├── sidepanel.html         # Main extension side panel UI
│   ├── sidepanel.js           # Controller: connects to LessonFlow, selects lessons, executes fill
│   └── sidepanel.css          # Neo-bento styling matching LessonFlow's clean aesthetic
├── options/
│   ├── options.html           # Chrome extension options page
│   └── options.js             # Saves API URL and personal token
├── shared/
│   ├── types.js               # Enums, message action constants, default configuration
│   └── validation.js          # Plain-text cleaner, CSS selector validation, host safety
├── demo/
│   └── school-website-simulator.html # Realistic safe school portal form for risk-free testing
├── icons/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── tests/
│   └── extension-tests.js     # Automated integration test suite
└── README.md                  # This guide
```

---

## 🚀 Beginner's Step-by-Step Installation Guide

No compilation or build step is needed — the extension uses native modern ES modules and Manifest V3.

### Step 1: Open Chrome's Extension Management Page
1. Open Google Chrome on your computer.
2. In the Chrome address bar, type `chrome://extensions` and press **Enter**.

### Step 2: Enable "Developer mode"
1. In the upper-right corner of the Extensions page, look for the toggle switch labeled **Developer mode**.
2. Switch **Developer mode** to **ON** (the toggle will turn blue).

### Step 3: Load the Unpacked Extension
1. Look at the top-left corner of the page. You will see three buttons:
   - **Load unpacked**
   - **Pack extension**
   - **Update**
2. Click the **Load unpacked** button.
3. In the file picker that opens, navigate to your LessonFlow project directory and select the **`lessonflow-extension`** folder.
4. Click **Select Folder** (or **Open**).
5. You will now see **LessonFlow — Teacher Assistant** listed among your Chrome extensions!

### Step 4: Pin the Extension Icon
1. In Chrome's top toolbar (next to the address bar), click the **Extensions icon** (looks like a puzzle piece 🧩).
2. Find **LessonFlow — Teacher Assistant** in the list.
3. Click the **Pin icon** (📌) next to it so it stays visible in your toolbar.

---

## 🔌 Connecting the Extension to LessonFlow

1. Start your LessonFlow application (by default running on `http://localhost:3000`).
2. In LessonFlow, go to **Settings** in the left sidebar.
3. Under **Chrome Extension API**, copy your **Personal API Token** (e.g., `lf_tok_6a3acbba...`).
4. Click the LessonFlow extension icon in your Chrome toolbar. The **Side Panel** will open on the right side of your browser.
5. In the top-right corner of the side panel, click the **Settings icon** (⚙️).
6. Verify the settings:
   - **LessonFlow API Base URL**: `http://localhost:3000` (or your deployed URL)
   - **Personal API Token**: Paste your token
7. Click **Save & Reconnect**.
8. The status indicator at the top will turn **green** and display **Connected**!

---

## 🧪 Testing on the Safe Demo Simulator First

**Important**: Always test on the safe demo form before using the live school website.

1. Open a new tab in Chrome and navigate to:
   ```text
   http://localhost:3000/demo-school-website
   ```
   *(Alternatively, you can open `lessonflow-extension/demo/school-website-simulator.html` directly in Chrome).*
2. Keep the **LessonFlow Side Panel** open on this tab.
3. You will see the target website detected as `localhost:3000 /demo-school-website` with the badge **"Form Detected"**.
4. In the side panel:
   - Select a **Week** from the dropdown.
   - Select a **Lesson Plan** from the dropdown.
5. Click **🔍 Inspect Website Fields**:
   - Move your mouse over the **Class** input box on the demo form. Notice the yellow highlight box and tooltip!
   - Click the **Class** input box.
   - In the popup in the side panel, associate it with **Class Name** and click **Save Mapping**.
   - Repeat for **Day of Week**, **Target**, and **Activities**.
6. Test **Mode 2 (Guided Fill)**:
   - Click the **Fill** button next to **Learning Target**.
   - Watch the field on the demo page update instantly and flash green with a checkmark!
7. Test **Mode 3 (Fill Mapped Fields)**:
   - Click **⚡ Fill All Mapped Fields**.
   - The extension will fill each mapped field sequentially, verify the values, and display a report.
8. Notice that the final submit button is **never clicked** by LessonFlow — you review the page and click it manually.

---

## 🏫 Real School Website Verification Checklist

When you are ready to use the extension on your actual school website, follow this verification checklist:

1. [ ] Log in to your school website as you normally do.
2. [ ] Navigate to your weekly curriculum / lesson entry page.
3. [ ] Open the LessonFlow side panel on that tab.
4. [ ] Select your prepared, reviewed lesson plan in LessonFlow.
5. [ ] Click **🔍 Inspect Website Fields** to map:
   - School class field
   - School section dropdown
   - School day dropdown
   - Learning target field
   - Activities field
   - Block 1 fields (Objective, Activities, etc.)
   - If the school form has an "Add Block" button, click it during inspection to map the button.
6. [ ] Click **Manage Mappings** to review your saved mappings.
7. [ ] Test with **1 harmless text field** first using Guided Fill.
8. [ ] Verify that the field value matches your LessonFlow data.
9. [ ] Run **Guided Fill** or **Fill Mapped Fields**.
10. [ ] **Manual Review & Submit**: Inspect the form with your own eyes and click the school website's Save/Submit button manually.

---

## 🛠️ Developer & Maintenance Notes

### Reloading After Code Changes
If you make edits to any file inside `lessonflow-extension/`:
1. Go to `chrome://extensions`.
2. Find **LessonFlow — Teacher Assistant**.
3. Click the **Reload icon** (circular arrow 🔄).
4. Refresh your school website tab.

### Running Automated Integration Tests
From the root directory of LessonFlow, run:
```bash
node lessonflow-extension/tests/extension-tests.js
```
This runs 20 automated tests validating selector sanitization, plain-text normalization, backend API contracts, and dropdown matching logic.
