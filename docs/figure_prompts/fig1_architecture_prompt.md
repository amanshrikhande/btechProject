# Fig. 1 — Multi-Tier Architecture Diagram Prompt

## Image Generation Instructions for DevShare System Architecture

### Figure Metadata
- **Figure Number:** Fig. 1
- **Title:** Multi-tier architecture of DevShare: browser client, Node.js gateway with MongoDB, and Python FastAPI AI service
- **Type:** System Architecture Diagram
- **Output Format:** PNG or SVG, 1400×900px minimum, 150-300 DPI
- **Color Scheme:** Dark mode with tier-specific accent colors

---

## Step-by-Step Image Generation Prompt

### Step 1: Canvas Setup
```
Create a professional software architecture diagram with the following specifications:
- Canvas size: 1400 pixels wide × 900 pixels tall
- Background: Dark navy (#0d0f1b or similar dark tech theme)
- Font: Sans-serif (Inter, Roboto, or SF Pro)
- Style: Flat design, no gradients, clean lines
- Overall layout: Vertical three-tier architecture with clear visual separation
```

### Step 2: Title and Header
```
At the top of the canvas (y=40px), center-align:
- Main title: "DevShare — Multi-Tier System Architecture"
  - Font size: 24px
  - Color: White (#ffffff)
  - Weight: Bold

Below title (y=70px):
- Subtitle: "Browser Client · Node.js Gateway + MongoDB · Python FastAPI AI Service"
  - Font size: 14px
  - Color: Light gray (#cbd5e1)
  - Weight: Regular
```

### Step 3: Tier 1 — Browser Client Layer (Top)
```
Position: y=120px to y=320px
Tier container:
- Width: 1200px (centered)
- Height: 200px
- Border: 2px solid cyan (#06b6d4)
- Background: rgba(6, 182, 212, 0.05)
- Border radius: 8px

Tier label (top-left corner inside):
- Text: "TIER 1: Browser Client"
- Subtitle: "React 19 · Vite 6 · Tailwind CSS 4 · Socket.IO Client"
- Color: Cyan (#06b6d4)
- Font size: 14px bold, 11px regular

Components (5 boxes in horizontal row, evenly spaced):

Box 1: Monaco Editor
- Position: x=150px
- Size: 180px × 120px
- Border: 1px solid #475569
- Background: rgba(255,255,255,0.05)
- Icon: </> symbol at top
- Label: "Monaco Editor"
- Sublabel: "Code editing\nSyntax highlighting"
- Font: 12px bold, 10px regular
- Color: #e2e8f0

Box 2: Socket.IO Client
- Position: x=360px
- Size: 180px × 120px
- Same styling as Box 1
- Icon: ⚡ symbol
- Label: "Socket.IO Client"
- Sublabel: "Real-time sync\nCollaboration"

Box 3: Auth Context
- Position: x=570px
- Size: 180px × 120px
- Same styling
- Icon: 🔐 symbol
- Label: "Auth Context"
- Sublabel: "JWT tokens\nUser session"

Box 4: AI Assistant Drawer
- Position: x=780px
- Size: 180px × 120px
- Same styling
- Icon: 🤖 symbol
- Label: "AI Assistant"
- Sublabel: "RAG chat panel\nCode suggestions"

Box 5: WebRTC Peer
- Position: x=990px
- Size: 180px × 120px
- Same styling
- Icon: 📹 symbol
- Label: "WebRTC Peer"
- Sublabel: "Audio/Video\nP2P streams"
```

### Step 4: Connection Arrow from Tier 1 to Tier 2
```
Draw two parallel downward arrows from bottom of Tier 1:

Left arrow (HTTP):
- Start: Center-bottom of Tier 1 (x=500px, y=320px)
- End: Top of Tier 2 (x=500px, y=360px)
- Style: Solid line, 3px width, color #64748b
- Arrow head: Filled triangle
- Label (left side): "HTTP/REST"
  - Sublabel: "Axios · port 5173→5000"
  - Font: 11px
  - Color: #94a3b8

Right arrow (WebSocket):
- Start: Center-bottom of Tier 1 (x=900px, y=320px)
- End: Top of Tier 2 (x=900px, y=360px)
- Style: Dashed line (- - -), 3px width, color #06b6d4
- Arrow head: Filled triangle
- Label (right side): "WebSocket"
  - Sublabel: "Socket.IO ws://"
  - Font: 11px
  - Color: #06b6d4
```

### Step 5: Tier 2 — Node.js Gateway Layer (Middle)
```
Position: y=360px to y=600px
Tier container:
- Width: 1200px (centered)
- Height: 240px
- Border: 2px solid green (#22c55e)
- Background: rgba(34, 197, 94, 0.05)
- Border radius: 8px

Tier label:
- Text: "TIER 2: Node.js / Express Gateway"
- Subtitle: "Express 4 · Socket.IO 4.8 · Mongoose 9 · Port 5000"
- Color: Green (#22c55e)

Internal layout: Two columns

LEFT COLUMN (REST API Controllers):
Position: x=150px, width=500px

Section header:
- Text: "REST API Controllers"
- Font: 13px bold
- Color: #22c55e

Five controller boxes stacked vertically:
Each box: 480px × 35px, 5px margin between

Controller 1:
- Label: "🔐 Auth Controller"
- Route: "POST /api/auth/register, /login"
- Style: Dark background rgba(255,255,255,0.03)

Controller 2:
- Label: "📁 Project Controller"
- Route: "GET/POST/PUT/DELETE /api/projects"

Controller 3:
- Label: "📄 File Controller"
- Route: "CRUD /api/files · triggers RAG sync"

Controller 4:
- Label: "▶️ Execution Controller"
- Route: "POST /api/execution/run → Piston"

Controller 5:
- Label: "📊 Analytics Controller"
- Route: "GET /api/analytics · CSV export"

Middleware box (below controllers):
- Size: 480px × 30px
- Label: "JWT Auth Middleware"
- Sublabel: "protect() · optionalAuth()"
- Border: 1px dashed #fbbf24

RIGHT COLUMN (Socket.IO Handler):
Position: x=670px, width=500px

Section header:
- Text: "Socket.IO Event Handler"
- Font: 13px bold
- Color: #06b6d4

Event handler box:
- Size: 480px × 180px
- Background: rgba(6, 182, 212, 0.08)
- Border: 1px solid #06b6d4

Inside, list 8 events:
1. "join / leaveRoom"
2. "codeChange → broadcast + 2s debounce"
3. "setLeaderMode / permissions"
4. "compileCode → Piston API"
5. "startInterview / endInterview"
6. "candidateFocusEvent (telemetry)"
7. "webrtc-signal relay"
8. "typing / cursorPosition"

Font: 10px, color #e2e8f0, line-height 20px
```

### Step 6: MongoDB Side Box (Left of Tier 2)
```
Position: x=50px, y=420px (left of Tier 2, vertically centered)
Box:
- Size: 200px × 160px
- Border: 2px solid purple (#a855f7)
- Background: rgba(168, 85, 247, 0.08)
- Border radius: 8px

Header:
- Text: "🗄️ MongoDB"
- Subtitle: "Port 27017"
- Color: #a855f7
- Font: 13px bold, 10px regular

Collections (6 pill-shaped badges):
Each pill: 180px × 22px, 3px margin

1. "Users"
2. "Projects"
3. "ProjectFiles"
4. "CodeVersions"
5. "RoomSessions"
6. "SessionEvents"

Pill style:
- Background: rgba(168, 85, 247, 0.15)
- Border: 1px solid #a855f7
- Border radius: 12px
- Text centered, 9px, color #e9d5ff

Double-headed arrow connecting MongoDB to Tier 2:
- From: Right edge of MongoDB box
- To: Left edge of Tier 2
- Style: Double arrow (⟷), 2px, color #a855f7
- Label above: "Mongoose ODM"
```

### Step 7: Connection Arrows from Tier 2 to Tier 3
```
Draw two arrows:

Arrow 1 (to AI Service):
- Start: Bottom center of Tier 2 (x=700px, y=600px)
- End: Top of Tier 3 (x=700px, y=640px)
- Style: Solid, 3px, color #64748b
- Label: "HTTP Axios · port 8000"
- Font: 11px, color #94a3b8

Arrow 2 (to Piston - external):
- Start: Right side of Execution Controller box
- End: Right edge of canvas (x=1350px, y=480px)
- Style: Dashed, 2px, color #f59e0b
- Label: "HTTPS → emkc.org/piston"
- Font: 10px, color #fbbf24

External service box (Piston):
Position: x=1250px, y=450px
- Size: 120px × 60px
- Border: 1px dashed #f59e0b
- Background: rgba(245, 158, 11, 0.05)
- Text: "🏖️ Piston API"
- Sublabel: "Code execution\nSandbox"
```

### Step 8: Tier 3 — Python AI Service Layer (Bottom)
```
Position: y=640px to y=880px (bottom of canvas)
Tier container:
- Width: 1200px
- Height: 240px
- Border: 2px solid orange (#f97316)
- Background: rgba(249, 115, 22, 0.05)
- Border radius: 8px

Tier label:
- Text: "TIER 3: Python FastAPI AI Service"
- Subtitle: "FastAPI · Uvicorn · Port 8000 · httpx"
- Color: Orange (#f97316)

Internal layout: Three sections

LEFT SECTION (Endpoints):
Position: x=150px, width=280px

Header: "FastAPI Endpoints"
Font: 13px bold, #f97316

5 endpoint boxes (each 260px × 30px):
1. "POST /api/chat"
2. "POST /api/rag/index"
3. "POST /api/rag/query"
4. "POST /api/rag/file/update"
5. "POST /api/analyze"

MIDDLE SECTION (Hybrid Retriever):
Position: x=450px, width=420px

Draw a central fusion box:
- Size: 400px × 160px
- Border: 2px solid #fbbf24
- Background: rgba(251, 191, 36, 0.08)

Title at top: "4-Channel Hybrid Retriever"

Four input channels (boxes feeding into center):
Top row:
  Box 1: "📄 Filename Match · ×0.15"
  Box 2: "🔤 BM25 Lexical · ×0.25"

Bottom row:
  Box 3: "🧠 ChromaDB Vector · ×0.40"
  Box 4: "🔗 Dependency Graph · ×0.20"

Each channel box: 180px × 35px
Arrows from all four → center fusion point

Center fusion formula (highlighted):
- Box: 380px × 40px, center of container
- Background: rgba(251, 191, 36, 0.2)
- Text: "final_score = 0.40·semantic + 0.25·lexical"
         "            + 0.20·structural + 0.15·filename"
- Font: 10px monospace, color #fef3c7

RIGHT SECTION (LLM Provider):
Position: x=890px, width=280px

Decision diamond:
- Shape: Rotated square (diamond), 120px × 120px
- Border: 2px solid #8b5cf6
- Text inside: "OPENROUTER\n_API_KEY\nset?"
- Font: 11px, color #c4b5fd

Two branches from diamond:

Branch 1 (Yes - top):
- Arrow pointing right-up
- Box: "✅ OpenRouter API"
- Sublabel: "openai/gpt-4o-mini"
- Size: 200px × 50px
- Border: 2px solid #10b981
- Background: rgba(16, 185, 129, 0.1)

Branch 2 (No - bottom):
- Arrow pointing right-down
- Box: "🦙 Local Ollama"
- Sublabel: "qwen2.5-coder:1.5b"
- Size: 200px × 50px
- Border: 2px solid #64748b
- Background: rgba(100, 116, 139, 0.1)
```

### Step 9: External Dependencies Below Tier 3
```
Two side boxes below Tier 3:

LEFT BOX (ChromaDB):
Position: x=150px, y=920px (below canvas, extend height if needed)
- Size: 280px × 100px
- Border: 2px solid #a855f7
- Background: rgba(168, 85, 247, 0.08)
- Title: "🗂️ ChromaDB"
- Subtitle: "./chroma_db"
- Details:
  "384-dim vectors"
  "all-MiniLM-L6-v2"
  "Cosine similarity"
- Font: 12px bold title, 10px details

Arrow connecting ChromaDB to Tier 3 hybrid retriever:
- Double-headed arrow
- Label: "Vector query"

RIGHT BOX (Evidence Validator):
Position: x=890px, y=920px
- Size: 280px × 100px
- Border: 2px solid #ef4444
- Background: rgba(239, 68, 68, 0.08)
- Title: "✅ Evidence Validator"
- Details:
  "Claim grounding check"
  "Citation validation"
  "Repair retry loop"
- Font: 12px bold title, 10px details

Arrow from LLM provider to Evidence Validator:
- Downward arrow
- Label: "JSON response"
```

### Step 10: Legend and Annotations
```
Position: Bottom-right corner (x=1050px, y=860px)

Legend box:
- Size: 200px × 80px
- Background: rgba(255,255,255,0.05)
- Border: 1px solid #475569
- Border radius: 4px

Legend items:
1. "━━━  Synchronous HTTP"
   Line: solid, 20px, color #64748b

2. "╌╌╌  WebSocket / Real-time"
   Line: dashed, 20px, color #06b6d4

3. "⟷   Bidirectional data flow"
   Symbol: double arrow, color #a855f7

Font: 9px, color #94a3b8, line-height 18px

Version watermark (bottom-left corner):
- Text: "DevShare v1.0 Architecture"
- Position: x=20px, y=1080px
- Font: 8px, color #475569
```

### Step 11: Visual Enhancements
```
Add subtle visual elements:

1. Drop shadows on all tier containers:
   - box-shadow: 0 4px 12px rgba(0,0,0,0.3)

2. Glow effect on active connections:
   - HTTP arrows: subtle white glow (blur 2px)
   - WebSocket arrows: cyan glow (blur 3px)

3. Hover states (if interactive SVG):
   - Tier boxes: brightness 110%
   - Component boxes: scale 1.02

4. Grid background (optional):
   - Subtle dot grid pattern
   - Color: rgba(255,255,255,0.02)
   - Spacing: 20px
```

---

## Tool-Specific Instructions

### For DALL-E / GPT-4o Image Generation:
```
Use this condensed version:

"Create a dark-themed (navy #0d0f1b) professional software architecture diagram 
showing three vertical tiers. Top tier (cyan border): Browser Client with 5 boxes 
(Monaco Editor, Socket.IO, Auth Context, AI Assistant, WebRTC). Middle tier 
(green border): Node.js Express Gateway with REST controllers on left (Auth, 
Project, File, Execution, Analytics) and Socket.IO event handler on right. 
MongoDB box (purple) on the left side. Bottom tier (orange border): Python FastAPI 
with endpoints list, central 4-channel hybrid retriever showing formula 
(0.40·semantic+0.25·lexical+0.20·structural+0.15·filename), and LLM decision 
diamond (OpenRouter vs Ollama). ChromaDB and Evidence Validator boxes below. 
Connect tiers with labeled arrows (HTTP solid, WebSocket dashed). Clean flat 
design, sans-serif font, 1400×900px."
```

### For Mermaid Diagram (Markdown Embedding):
See the Mermaid code block I provided earlier in this document.

### For Figma / Sketch / Design Tools:
1. Import this prompt as a design brief
2. Use the exact pixel measurements provided
3. Export as PNG at 2x resolution (2800×1800) for Retina displays
4. Alternative export: SVG for infinite scaling

### For Python matplotlib / Graphviz:
```python
# Use the coordinates and colors specified in Steps 1-11
# Libraries: matplotlib.patches.Rectangle, matplotlib.patches.FancyBboxPatch
# Color palette:
COLORS = {
    'bg': '#0d0f1b',
    'tier1': '#06b6d4',  # cyan
    'tier2': '#22c55e',  # green
    'tier3': '#f97316',  # orange
    'mongodb': '#a855f7', # purple
    'text': '#e2e8f0'
}
```

---

## Quality Checklist

Before finalizing the image, verify:

- [ ] All three tiers are clearly separated and labeled
- [ ] Component boxes have readable text at 100% zoom
- [ ] Arrows have directional indicators and labels
- [ ] Color contrast meets WCAG AA standards (4.5:1 minimum)
- [ ] MongoDB is visually distinct as a separate persistence layer
- [ ] Hybrid retriever fusion formula is prominently displayed
- [ ] LLM provider decision logic is clear
- [ ] External services (Piston, ChromaDB) are visually differentiated
- [ ] Legend explains all line types
- [ ] Overall composition is balanced (not left/right heavy)
- [ ] Export resolution is print-quality (300 DPI minimum)
- [ ] File format supports transparency if needed (PNG/SVG)

---

## Variations and Alternatives

### Simplified Version (for slides):
- Remove sublabels
- Increase font sizes by 20%
- Show only 3 components per tier
- Reduce color palette to 3 colors

### Detailed Version (for technical documentation):
- Add port numbers to all connections
- Show middleware stack in detail
- Add error handling flows
- Include security boundaries (firewall icons)

### Animation Sequence (for video):
1. Fade in tiers one by one (top to bottom)
2. Animate arrows as data flows
3. Highlight active path for a user request
4. Show RAG query flow with retrieval channels lighting up

---

## Related Figures (Future Prompts)

This diagram pairs with:
- **Fig. 2:** RAG Pipeline Flow (chunking → embedding → retrieval → LLM)
- **Fig. 3:** Real-time Collaboration Sequence Diagram
- **Fig. 4:** Leader Mode Permission State Machine
- **Fig. 5:** Interview Monitoring Telemetry Flow

---

**End of Prompt Document**

*Generated: 2026-01-19*
*Version: 1.0*
*Project: DevShare Multi-Tier Architecture*
