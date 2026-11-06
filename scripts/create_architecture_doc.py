from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "0password-project-architecture.docx"

INK = "1F2937"
MUTED = "4B5563"
ACCENT = "4338CA"
PALE = "EEF2FF"
LINE = "D1D5DB"


def shade(cell, fill):
    props = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    props.append(shd)


def border_bottom(paragraph, color=LINE):
    ppr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "7")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    ppr.append(borders)


def set_cell_margins(cell, top=100, start=140, bottom=100, end=140):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    mar = tc_pr.first_child_found_in("w:tcMar")
    if mar is None:
        mar = OxmlElement("w:tcMar")
        tc_pr.append(mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = mar.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_font(run, size=None, bold=None, color=None, italic=None):
    run.font.name = "Aptos"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    if italic is not None:
        run.italic = italic


def add_text(paragraph, text, **kwargs):
    run = paragraph.add_run(text)
    set_font(run, **kwargs)
    return run


def add_heading(doc, text, level=1):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(16 if level == 1 else 10)
    paragraph.paragraph_format.space_after = Pt(6)
    add_text(paragraph, text, size=15 if level == 1 else 11, bold=True, color=INK)
    if level == 1:
        border_bottom(paragraph)
    return paragraph


def add_bullet(doc, text):
    paragraph = doc.add_paragraph(style="List Bullet")
    paragraph.paragraph_format.space_after = Pt(2)
    add_text(paragraph, text, size=9.5, color=INK)


def add_body(doc, text):
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.line_spacing = 1.12
    add_text(paragraph, text, size=9.5, color=INK)
    return paragraph


def add_table(doc, headers, rows, widths):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = False
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.width = Inches(widths[i])
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        shade(cell, INK)
        set_cell_margins(cell)
        add_text(cell.paragraphs[0], header, size=8.5, bold=True, color="FFFFFF")
    for row_index, row in enumerate(rows):
        cells = table.add_row().cells
        for i, value in enumerate(row):
            cells[i].width = Inches(widths[i])
            cells[i].vertical_alignment = WD_ALIGN_VERTICAL.TOP
            set_cell_margins(cells[i])
            if row_index % 2:
                shade(cells[i], "F9FAFB")
            add_text(cells[i].paragraphs[0], value, size=8.5, color=INK)
    doc.add_paragraph().paragraph_format.space_after = Pt(1)
    return table


def add_architecture_diagram(doc):
    table = doc.add_table(rows=1, cols=5)
    table.autofit = False
    labels = ["Browser\nReact UI", "Clerk\nIdentity", "Next.js\nServer Actions", "Supabase\nPostgreSQL", "Ciphertext\nVault Items"]
    widths = [1.3, 1.15, 1.45, 1.25, 1.35]
    for index, label in enumerate(labels):
        cell = table.rows[0].cells[index]
        cell.width = Inches(widths[index])
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        shade(cell, PALE if index in (0, 4) else "F9FAFB")
        set_cell_margins(cell, top=180, bottom=180)
        paragraph = cell.paragraphs[0]
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        lines = label.split("\n")
        add_text(paragraph, lines[0], size=9, bold=True, color=ACCENT if index in (0, 4) else INK)
        paragraph.add_run("\n")
        add_text(paragraph, lines[1], size=8, color=MUTED)
    caption = doc.add_paragraph()
    caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
    caption.paragraph_format.space_before = Pt(4)
    caption.paragraph_format.space_after = Pt(10)
    add_text(caption, "Credentials are encrypted in the browser before server-side persistence.", size=8.5, italic=True, color=MUTED)


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = Document()
    section = doc.sections[0]
    section.top_margin = Inches(0.55)
    section.bottom_margin = Inches(0.55)
    section.left_margin = Inches(0.65)
    section.right_margin = Inches(0.65)

    normal = doc.styles["Normal"]
    normal.font.name = "Aptos"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    normal.font.size = Pt(9.5)

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title.paragraph_format.space_after = Pt(3)
    add_text(title, "0Password Project Architecture", size=23, bold=True, color=INK)
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subtitle.paragraph_format.space_after = Pt(13)
    add_text(subtitle, "A technical guide to the password manager's application structure and security boundaries", size=10, color=MUTED)

    add_heading(doc, "Purpose")
    add_body(doc, "0Password is a personal password manager built with Next.js. It combines Clerk authentication, browser-side cryptography, and Supabase storage so that credential passwords are encrypted before they are sent to the server. This document describes the running application's major modules, request paths, and security responsibilities.")

    add_heading(doc, "System Overview")
    add_architecture_diagram(doc)
    add_table(doc, ["Layer", "Responsibility", "Key implementation areas"], [
        ("Presentation", "Renders landing, authentication, vault, search, and credential-management interfaces.", "app/, components/"),
        ("Identity and routing", "Authenticates users, protects dashboard routes, and redirects signed-in users from auth pages.", "Clerk, proxy.ts"),
        ("Vault session", "Keeps the derived AES key only in browser memory and locks after 15 minutes of inactivity.", "masterKey.ts, vault-session-provider.tsx"),
        ("Application services", "Validates inputs, checks the authenticated user, calls Supabase RPC functions, and revalidates the dashboard.", "app/actions/vault.ts"),
        ("Data and database", "Stores user records, vault metadata, encrypted passwords, and SQL procedures for setup, mutation, reset, and search.", "Supabase, migration SQL"),
    ], [1.2, 3.5, 1.6])

    add_heading(doc, "Repository Layout")
    add_table(doc, ["Location", "Contents and role"], [
        ("app/", "Next.js App Router pages, layouts, server actions, and the Clerk webhook endpoint."),
        ("components/", "Client-side user interface, vault lock/unlock flow, cards, dialogs, sidebar, and shared UI primitives."),
        ("lib/", "Cryptography, vault protocol schemas, session state, safe URL handling, and query normalization."),
        ("supabase/migrations/", "Database schema, security grants, row-level security configuration, and PostgreSQL RPC functions."),
        ("tests/", "Unit tests for cryptography, unlocking, session lifetime, protocol validation, search, and optional database integration."),
        ("proxy.ts", "Clerk middleware protecting dashboard routes and handling auth-page redirects."),
    ], [1.7, 4.6])

    add_heading(doc, "Credential Lifecycle")
    add_table(doc, ["Step", "What happens", "Security boundary"], [
        ("1. Sign in", "Clerk creates the authenticated application session. Middleware requires a signed-in user for /dashboard routes.", "Identity is verified before vault data is requested."),
        ("2. Unlock or create", "The browser retrieves vault metadata. A new vault requires a 12-character minimum master password; an existing vault verifies a small encrypted marker.", "Master password is used only in the browser."),
        ("3. Derive key", "Web Crypto PBKDF2 derives a non-extractable AES-256-GCM key using a 16-byte vault salt, SHA-256, and 600,000 iterations.", "Derived key remains in memory, not in storage."),
        ("4. Encrypt item", "Before save or password update, the browser creates a new 12-byte random IV and encrypts the password with AES-GCM.", "Only ciphertext and IV are sent to the server."),
        ("5. Persist and load", "Server actions validate inputs and call service-role-only Supabase RPC functions. Search returns metadata plus encrypted password fields.", "Supabase stores ciphertext, IV, and non-secret metadata."),
        ("6. Lock", "The session clears after 15 minutes of inactivity, after account changes, or when the user locks the vault.", "The in-memory key is discarded."),
    ], [0.8, 3.6, 1.9])

    add_heading(doc, "Data Model and Privacy")
    add_body(doc, "The primary data is split between vault metadata and credential records. Password contents are protected by encryption. Service title, login identifier, and website URL remain readable by the server to support listing and search.")
    add_table(doc, ["Stored data", "Purpose", "Encrypted"], [
        ("vault_metadata", "Vault identifier, format version, KDF salt and iterations, plus an encrypted verification value.", "Verification value only"),
        ("vault_items.title", "Service label displayed in the dashboard and used by search.", "No"),
        ("vault_items.login_id", "Username or email shown in the dashboard and used by search.", "No"),
        ("vault_items.website_url", "Optional HTTP or HTTPS destination shown on a credential.", "No"),
        ("vault_items.encrypted_password and iv", "AES-GCM encrypted password and the IV required to decrypt it.", "Yes"),
    ], [2.4, 3.2, 1.0])

    add_heading(doc, "Server and Database Responsibilities")
    add_bullet(doc, "Server actions authenticate the Clerk user and validate all mutation payloads with Zod before they reach the database.")
    add_bullet(doc, "The Clerk webhook synchronizes user records into Supabase after user creation or updates.")
    add_bullet(doc, "Database tables have row-level security enabled and table/RPC privileges are revoked from public, anonymous, and authenticated Supabase roles.")
    add_bullet(doc, "Service-role-only procedures serialize vault setup, credential writes, resets, and search; setup detects stale legacy data before it changes ciphertext.")
    add_bullet(doc, "The reset flow requires an explicit RESET VAULT confirmation and compares a captured vault revision before deleting stored credentials.")

    add_heading(doc, "Primary User Flows")
    add_table(doc, ["Flow", "Client work", "Server/database work"], [
        ("Create vault", "Derive key, encrypt verification text, and prepare initial metadata.", "Create or synchronize user, then atomically initialize vault metadata and migrated items."),
        ("Unlock vault", "Derive the key and decrypt the verification marker; retain key in memory only after success.", "Return metadata or legacy item state for the signed-in user."),
        ("Add or edit credential", "Validate form, encrypt a changed password, and retain plaintext only for the current UI session.", "Validate request then call write_vault_item to insert or update the user's record."),
        ("Search credentials", "Debounce and place the query in the dashboard URL.", "Escape wildcard characters in the search procedure and filter by the authenticated user's identifier."),
        ("Reset vault", "Require typed confirmation and clear browser session after success.", "Confirm vault revision, then delete items and metadata atomically."),
    ], [1.45, 2.8, 2.35])

    add_heading(doc, "Operational Notes")
    add_bullet(doc, "Environment configuration requires a Supabase URL and service-role key, along with Clerk publishable, secret, and webhook keys.")
    add_bullet(doc, "The database migration assumes existing users and vault_items tables. It must be run before the current vault implementation is deployed.")
    add_bullet(doc, "The client has a 15-minute inactivity lock and uses BroadcastChannel to propagate vault resets across browser tabs.")
    add_bullet(doc, "Tests cover cryptographic behavior, key/session lifecycle, unlock and migration behavior, schemas, search normalization, and an optional disposable PostgreSQL integration test.")

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    add_text(footer, "0Password architecture reference", size=8, color=MUTED)

    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build()
