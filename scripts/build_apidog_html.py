import json
import os

with open('scripts/assembled_data.json', 'r', encoding='utf-8') as f:
    DATA = json.load(f)

# Normalize fields for UI compatibility
for p in DATA.get('pages', []):
    if not p.get('path'):
        p['path'] = p.get('endpoint') or p.get('route') or p.get('name') or ''
    if not p.get('sourceFile'):
        p['sourceFile'] = p.get('file') or ''
    if not p.get('description'):
        p['description'] = p.get('summary') or ''

for a in DATA.get('apis', []):
    if not a.get('sourceFile'):
        a['sourceFile'] = a.get('file') or a.get('backendSourceFile') or ''
    if not a.get('description'):
        a['description'] = a.get('summary') or ''

data_json_str = json.dumps(DATA, ensure_ascii=False)

html_template = """<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EnvOcc PM2.5 — System Technical Documentation</title>
    <style>
        :root {
            --bg-body: #ffffff;
            --bg-sidebar: #f8fafc;
            --bg-card: #ffffff;
            --border-color: #e2e8f0;
            --border-light: #f1f5f9;
            --primary: #2563eb;
            --primary-light: #eff6ff;
            --primary-hover: #1d4ed8;
            --text-main: #1e293b;
            --text-muted: #64748b;
            --text-light: #94a3b8;
            --code-bg: #f8fafc;
            --code-border: #e2e8f0;
            
            /* HTTP Method Colors (Apidog / Postman standard) */
            --get-color: #059669;
            --get-bg: #ecfdf5;
            --post-color: #2563eb;
            --post-bg: #eff6ff;
            --put-color: #d97706;
            --put-bg: #fffbeb;
            --patch-color: #7c3aed;
            --patch-bg: #f5f3ff;
            --delete-color: #dc2626;
            --delete-bg: #fef2f2;
            
            --verified-color: #059669;
            --inferred-color: #d97706;
            
            --font-main: 'Sarabun', 'Prompt', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: var(--font-main);
            background-color: var(--bg-body);
            color: var(--text-main);
            line-height: 1.5;
            font-size: 14px;
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }

        /* Top Header */
        .top-header {
            height: 54px;
            background: #ffffff;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 20px;
            z-index: 100;
            flex-shrink: 0;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .header-logo {
            width: 28px;
            height: 28px;
            background: var(--primary);
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
        }

        .header-title-box {
            display: flex;
            align-items: baseline;
            gap: 8px;
        }

        .header-title {
            font-size: 15px;
            font-weight: 700;
            color: var(--text-main);
        }

        .header-badge {
            font-size: 11px;
            background: var(--primary-light);
            color: var(--primary);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }

        .header-search {
            position: relative;
            width: 380px;
        }

        .search-input {
            width: 100%;
            height: 34px;
            padding: 0 34px 0 32px;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            font-size: 13px;
            font-family: inherit;
            background: #f8fafc;
            outline: none;
            transition: all 0.15s ease;
        }

        .search-input:focus {
            background: #ffffff;
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
        }

        .search-icon-left {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-light);
            font-size: 13px;
            pointer-events: none;
        }

        .search-kbd {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 10px;
            color: var(--text-light);
            border: 1px solid var(--border-color);
            padding: 1px 4px;
            border-radius: 4px;
            background: #ffffff;
        }

        .header-actions {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .btn {
            height: 32px;
            padding: 0 12px;
            border-radius: 6px;
            font-size: 12.5px;
            font-weight: 500;
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
            border: 1px solid transparent;
            text-decoration: none;
        }

        .btn-default {
            background: #ffffff;
            border-color: var(--border-color);
            color: var(--text-main);
        }

        .btn-default:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
        }

        .btn-primary {
            background: var(--primary);
            color: #ffffff;
        }

        .btn-primary:hover {
            background: var(--primary-hover);
        }

        /* App Main Area */
        .app-body {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        /* Sidebar */
        .sidebar {
            width: 310px;
            background: var(--bg-sidebar);
            border-right: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            flex-shrink: 0;
            overflow: hidden;
        }

        .sidebar-header {
            padding: 10px 14px;
            border-bottom: 1px solid var(--border-color);
        }

        .sidebar-filter-input {
            width: 100%;
            height: 28px;
            padding: 0 8px;
            font-size: 12px;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            background: #ffffff;
            outline: none;
        }

        .sidebar-tree {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
        }

        .tree-group {
            margin-bottom: 6px;
        }

        .tree-group-title {
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            user-select: none;
        }

        .tree-group-title:hover {
            color: var(--text-main);
        }

        .tree-node {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px 6px 22px;
            font-size: 13px;
            color: var(--text-main);
            cursor: pointer;
            user-select: none;
            transition: background 0.1s ease;
            position: relative;
        }

        .tree-node:hover {
            background: #f1f5f9;
        }

        .tree-node.active {
            background: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
        }

        .tree-node.active::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 3px;
            background: var(--primary);
        }

        .tree-subnode {
            padding-left: 36px;
        }

        .tree-chevron {
            font-size: 10px;
            color: var(--text-light);
            width: 14px;
            display: inline-block;
            transition: transform 0.15s ease;
        }

        .tree-chevron.expanded {
            transform: rotate(90deg);
        }

        .method-tag {
            font-size: 10px;
            font-weight: 700;
            padding: 1px 5px;
            border-radius: 3px;
            text-transform: uppercase;
            font-family: var(--font-mono);
            letter-spacing: 0.02em;
        }

        .method-GET { background: var(--get-bg); color: var(--get-color); border: 1px solid rgba(5, 150, 105, 0.2); }
        .method-POST { background: var(--post-bg); color: var(--post-color); border: 1px solid rgba(37, 99, 235, 0.2); }
        .method-PUT { background: var(--put-bg); color: var(--put-color); border: 1px solid rgba(217, 119, 6, 0.2); }
        .method-PATCH { background: var(--patch-bg); color: var(--patch-color); border: 1px solid rgba(124, 58, 237, 0.2); }
        .method-DELETE { background: var(--delete-bg); color: var(--delete-color); border: 1px solid rgba(220, 38, 38, 0.2); }
        .method-PAGE { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
        .method-ACTION { background: #fdf2f8; color: #db2777; border: 1px solid #fbcfe8; }

        /* Main Content Canvas */
        .content-area {
            flex: 1;
            overflow-y: auto;
            background: #ffffff;
            padding: 24px 40px 60px;
        }

        .content-breadcrumbs {
            font-size: 12px;
            color: var(--text-muted);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .entity-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .entity-title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 6px;
        }

        .entity-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--text-main);
        }

        .entity-endpoint-box {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f8fafc;
            border: 1px solid var(--border-color);
            padding: 4px 10px;
            border-radius: 6px;
            font-family: var(--font-mono);
            font-size: 13px;
            color: var(--text-main);
            margin-bottom: 10px;
        }

        .entity-desc {
            font-size: 13.5px;
            color: var(--text-muted);
            line-height: 1.6;
        }

        /* Information Grid Card */
        .info-card {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 24px;
        }

        .info-card-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-main);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 12px 20px;
            font-size: 13px;
        }

        .meta-item {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .meta-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .meta-value {
            font-weight: 500;
            color: var(--text-main);
            word-break: break-all;
        }

        /* Clean Tables */
        .apidog-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            margin-bottom: 20px;
        }

        .apidog-table th {
            background: #f8fafc;
            color: var(--text-muted);
            text-align: left;
            padding: 8px 12px;
            border-top: 1px solid var(--border-color);
            border-bottom: 1px solid var(--border-color);
            font-weight: 600;
            font-size: 12px;
        }

        .apidog-table td {
            padding: 10px 12px;
            border-bottom: 1px solid var(--border-light);
            color: var(--text-main);
            vertical-align: top;
        }

        .apidog-table tr:hover td {
            background: #f8fafc;
        }

        .field-name {
            font-family: var(--font-mono);
            font-size: 12.5px;
            font-weight: 600;
            color: var(--primary);
        }

        .field-type {
            font-family: var(--font-mono);
            font-size: 11px;
            color: #475569;
            background: #f1f5f9;
            padding: 1px 4px;
            border-radius: 3px;
        }

        .req-tag {
            color: #dc2626;
            font-weight: 700;
            font-size: 11px;
        }

        .opt-tag {
            color: var(--text-light);
            font-size: 11px;
        }

        /* Code Block */
        .code-box {
            background: var(--code-bg);
            border: 1px solid var(--code-border);
            border-radius: 6px;
            position: relative;
            margin-bottom: 16px;
        }

        .code-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            border-bottom: 1px solid var(--code-border);
            font-size: 11px;
            color: var(--text-muted);
            font-weight: 600;
        }

        .code-content {
            padding: 12px;
            font-family: var(--font-mono);
            font-size: 12.5px;
            color: #0f172a;
            overflow-x: auto;
            white-space: pre-wrap;
            line-height: 1.5;
        }

        .btn-copy {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 2px 8px;
            font-size: 11px;
            color: var(--text-muted);
            cursor: pointer;
        }

        .btn-copy:hover {
            color: var(--primary);
            border-color: var(--primary);
        }

        /* Tabs inside content */
        .content-tabs {
            display: flex;
            gap: 20px;
            border-bottom: 1px solid var(--border-color);
            margin-bottom: 20px;
        }

        .content-tab {
            padding: 8px 0;
            font-size: 13.5px;
            font-weight: 600;
            color: var(--text-muted);
            cursor: pointer;
            border-bottom: 2px solid transparent;
            margin-bottom: -1px;
        }

        .content-tab.active {
            color: var(--primary);
            border-bottom-color: var(--primary);
        }

        /* Disclaimer Notice */
        .disclaimer-banner {
            background: #fffbeb;
            border: 1px solid #fef3c7;
            border-radius: 6px;
            padding: 8px 14px;
            font-size: 12px;
            color: #b45309;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Dependency Flow visualization */
        .flow-container {
            background: #f8fafc;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            overflow-x: auto;
        }

        .flow-steps {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-width: 720px;
        }

        .flow-step-box {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 12px 14px;
            flex: 1;
            text-align: center;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .flow-step-box.highlight {
            border-color: var(--primary);
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }

        .flow-step-title {
            font-size: 11px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .flow-step-val {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-main);
            font-family: var(--font-mono);
            word-break: break-all;
        }

        .flow-arrow {
            color: var(--primary);
            font-weight: 700;
            font-size: 16px;
        }

        /* Split verification columns */
        .impact-split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .impact-col {
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
        }

        .impact-col-header {
            font-size: 13.5px;
            font-weight: 700;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .badge-verified {
            background: var(--get-bg);
            color: var(--get-color);
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }

        .badge-inferred {
            background: var(--put-bg);
            color: var(--put-color);
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
        }

        /* Modal styling */
        .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(2px);
            z-index: 1000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .modal-overlay.open {
            display: flex;
        }

        .modal-box {
            background: #ffffff;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            width: 100%;
            max-width: 680px;
            max-height: 85vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-head {
            padding: 14px 20px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-weight: 700;
            font-size: 15px;
        }

        .modal-body {
            padding: 20px;
            overflow-y: auto;
            flex: 1;
        }

        .modal-foot {
            padding: 12px 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            background: #f8fafc;
        }

        .form-group {
            margin-bottom: 14px;
        }

        .form-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: var(--text-main);
            margin-bottom: 4px;
        }

        .form-input, .form-textarea {
            width: 100%;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 13px;
            font-family: inherit;
            outline: none;
        }

        .form-input:focus, .form-textarea:focus {
            border-color: var(--primary);
        }

        .form-textarea {
            min-height: 70px;
            resize: vertical;
        }

        /* Search Results Overlay */
        .search-results-overlay {
            position: absolute;
            top: 42px;
            left: 0;
            right: 0;
            background: #ffffff;
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
            max-height: 380px;
            overflow-y: auto;
            display: none;
            z-index: 200;
        }

        .search-results-overlay.open {
            display: block;
        }

        .search-result-item {
            padding: 8px 12px;
            border-bottom: 1px solid var(--border-light);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .search-result-item:hover {
            background: #f8fafc;
        }

        .search-result-title {
            font-weight: 600;
            font-size: 13px;
        }

        .search-result-sub {
            font-size: 11px;
            color: var(--text-muted);
        }

        /* Toast */
        .toast-popup {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1e293b;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 6px;
            font-size: 13px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: none;
            z-index: 2000;
        }
    </style>
</head>
<body>

    <!-- Top Header Bar -->
    <header class="top-header">
        <div class="header-left">
            <div class="header-logo">EO</div>
            <div class="header-title-box">
                <span class="header-title">EnvOcc PM2.5 — System Technical Documentation</span>
                <span class="header-badge">v1.0.0 (Verified)</span>
                <span style="font-size:11px; color:#059669; font-weight:600;">● Offline Single File</span>
            </div>
        </div>

        <div class="header-search">
            <span class="search-icon-left">🔍</span>
            <input type="text" id="global-search" class="search-input" 
                   placeholder="ค้นหา Page, API, Function, Field, Source File... (⌘K / Ctrl+K)"
                   oninput="handleGlobalSearch(this.value)">
            <span class="search-kbd">⌘K</span>
            <div class="search-results-overlay" id="search-results-box"></div>
        </div>

        <div class="header-actions">
            <button class="btn btn-default" onclick="openAddModal()">+ เพิ่ม Page/API</button>
            <button class="btn btn-default" onclick="openImportModal()">📥 Import JSON</button>
            <button class="btn btn-default" onclick="exportJSON()">📤 Export JSON</button>
            <button class="btn btn-primary" onclick="exportHTML()">💾 Export HTML (Save Data)</button>
        </div>
    </header>

    <div class="app-body">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-header">
                <input type="text" class="sidebar-filter-input" placeholder="กรองเมนู Sidebar..." oninput="filterSidebar(this.value)">
            </div>
            <div class="sidebar-tree" id="sidebar-tree-container">
                <!-- Rendered dynamically according to Section 3 -->
            </div>
        </aside>

        <!-- Main Content View -->
        <main class="content-area" id="main-content-view">
            <!-- Dynamic Content loaded here -->
        </main>
    </div>

    <!-- Edit Modal -->
    <div class="modal-overlay" id="edit-modal">
        <div class="modal-box">
            <div class="modal-head">
                <span id="modal-title">แก้ไขข้อมูล</span>
                <button style="border:none; background:none; cursor:pointer;" onclick="closeModal('edit-modal')">✕</button>
            </div>
            <div class="modal-body" id="modal-form-container">
                <!-- Dynamic form -->
            </div>
            <div class="modal-foot">
                <button class="btn btn-default" onclick="closeModal('edit-modal')">ยกเลิก</button>
                <button class="btn btn-primary" onclick="saveEntityEdit()">บันทึกการแก้ไข</button>
            </div>
        </div>
    </div>

    <!-- Import Modal -->
    <div class="modal-overlay" id="import-modal">
        <div class="modal-box">
            <div class="modal-head">
                <span>นำเข้าข้อมูล JSON (Import Documentation)</span>
                <button style="border:none; background:none; cursor:pointer;" onclick="closeModal('import-modal')">✕</button>
            </div>
            <div class="modal-body">
                <p style="font-size:12.5px; color:var(--text-muted); margin-bottom:12px;">
                    เลือกไฟล์ JSON หรือวางเนื้อหา JSON เพื่ออัปเดตข้อมูล Pages และ APIs ภายในเอกสาร
                </p>
                <input type="file" id="import-file-input" accept=".json" style="margin-bottom:12px; font-size:12px;" onchange="handleFileImport(event)">
                <textarea id="import-json-text" class="form-textarea" style="height:140px; font-family:var(--font-mono); font-size:12px;" placeholder="หรือวางข้อความ JSON ที่นี่..."></textarea>
            </div>
            <div class="modal-foot">
                <button class="btn btn-default" onclick="closeModal('import-modal')">ยกเลิก</button>
                <button class="btn btn-primary" onclick="applyImportJSON()">นำเข้าข้อมูล (Apply)</button>
            </div>
        </div>
    </div>

    <!-- Toast -->
    <div class="toast-popup" id="toast-popup">ข้อความแจ้งเตือน</div>

    <script>
        // --- 1. APPLICATION DATA STORE ---
        /* __DATA_START__ */
        let APP_DATA = __APP_DATA_PLACEHOLDER__;
        /* __DATA_END__ */

        let activeView = { type: 'overview', id: null };

        // --- 2. SIDEBAR RENDERING (Section 3) ---
        function renderSidebar(filterText = '') {
            const container = document.getElementById('sidebar-tree-container');
            const q = filterText.toLowerCase().trim();

            let html = '';

            // Overview Menu
            html += `
                <div class="tree-node ${activeView.type === 'overview' ? 'active' : ''}" onclick="showOverview()">
                    <span>🏛️</span>
                    <span>ภาพรวมระบบ (Overview)</span>
                </div>
            `;

            // PAGES Section
            html += `
                <div class="tree-group">
                    <div class="tree-group-title" onclick="toggleGroup('grp-pages')">
                        <span>PAGES (${APP_DATA.pages.length})</span>
                        <span class="tree-chevron expanded" id="chev-grp-pages">▶</span>
                    </div>
                    <div id="grp-pages">
                        <!-- 3.1 ก่อนเข้าสู่ระบบ (Public Pages) -->
                        <div class="tree-group-title" style="padding-left:20px; font-size:10.5px; color:#2563eb;" onclick="toggleGroup('grp-pages-public')">
                            <span>3.1 ก่อนเข้าสู่ระบบ (Public)</span>
                            <span class="tree-chevron expanded" id="chev-grp-pages-public">▶</span>
                        </div>
                        <div id="grp-pages-public">
                            ${APP_DATA.pages.filter(p => p.authRequirement.includes('Public')).map(p => `
                                <div class="tree-node tree-subnode ${activeView.type === 'page' && activeView.id === p.id ? 'active' : ''}" onclick="showPage('${p.id}')">
                                    <span class="method-tag method-PAGE">PAGE</span>
                                    <span title="${p.name}">${p.path}</span>
                                </div>
                            `).join('')}
                        </div>

                        <!-- 3.2 หลังเข้าสู่ระบบ (Authenticated Pages by Roles) -->
                        <div class="tree-group-title" style="padding-left:20px; font-size:10.5px; color:#2563eb;" onclick="toggleGroup('grp-pages-auth')">
                            <span>3.2 หลังเข้าสู่ระบบ (Authenticated)</span>
                            <span class="tree-chevron expanded" id="chev-grp-pages-auth">▶</span>
                        </div>
                        <div id="grp-pages-auth">
                            <!-- Superadmin -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-p-superadmin')">
                                <span>Superadmin (${APP_DATA.pages.filter(p => p.allowedRoles.includes('superadmin')).length})</span>
                                <span class="tree-chevron expanded" id="chev-grp-p-superadmin">▶</span>
                            </div>
                            <div id="grp-p-superadmin">
                                ${APP_DATA.pages.filter(p => p.allowedRoles.includes('superadmin')).map(p => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'page' && activeView.id === p.id ? 'active' : ''}" style="padding-left:44px;" onclick="showPage('${p.id}')">
                                        <span class="method-tag method-PAGE">PAGE</span>
                                        <span>${p.path}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Administrator -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-p-admin')">
                                <span>Administrator (${APP_DATA.pages.filter(p => p.allowedRoles.includes('admin') || p.allowedRoles.includes('adminenvocc')).length})</span>
                                <span class="tree-chevron" id="chev-grp-p-admin">▶</span>
                            </div>
                            <div id="grp-p-admin" style="display:none;">
                                ${APP_DATA.pages.filter(p => p.allowedRoles.includes('admin') || p.allowedRoles.includes('adminenvocc')).map(p => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'page' && activeView.id === p.id ? 'active' : ''}" style="padding-left:44px;" onclick="showPage('${p.id}')">
                                        <span class="method-tag method-PAGE">PAGE</span>
                                        <span>${p.path}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Regional / Provincial Officer -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-p-officer')">
                                <span>Regional / Provincial Officer (${APP_DATA.pages.filter(p => p.allowedRoles.includes('admin_region') || p.allowedRoles.includes('admin_province')).length})</span>
                                <span class="tree-chevron" id="chev-grp-p-officer">▶</span>
                            </div>
                            <div id="grp-p-officer" style="display:none;">
                                ${APP_DATA.pages.filter(p => p.allowedRoles.includes('admin_region') || p.allowedRoles.includes('admin_province')).map(p => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'page' && activeView.id === p.id ? 'active' : ''}" style="padding-left:44px;" onclick="showPage('${p.id}')">
                                        <span class="method-tag method-PAGE">PAGE</span>
                                        <span>${p.path}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- General User -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-p-user')">
                                <span>General User (${APP_DATA.pages.filter(p => p.allowedRoles.includes('user')).length})</span>
                                <span class="tree-chevron" id="chev-grp-p-user">▶</span>
                            </div>
                            <div id="grp-p-user" style="display:none;">
                                ${APP_DATA.pages.filter(p => p.allowedRoles.includes('user')).map(p => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'page' && activeView.id === p.id ? 'active' : ''}" style="padding-left:44px;" onclick="showPage('${p.id}')">
                                        <span class="method-tag method-PAGE">PAGE</span>
                                        <span>${p.path}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // APIs Section
            html += `
                <div class="tree-group">
                    <div class="tree-group-title" onclick="toggleGroup('grp-apis')">
                        <span>APIS (${APP_DATA.apis.length})</span>
                        <span class="tree-chevron expanded" id="chev-grp-apis">▶</span>
                    </div>
                    <div id="grp-apis">
                        <!-- 3.3 ก่อนเข้าสู่ระบบ (Public APIs) -->
                        <div class="tree-group-title" style="padding-left:20px; font-size:10.5px; color:#2563eb;" onclick="toggleGroup('grp-apis-public')">
                            <span>3.3 ก่อนเข้าสู่ระบบ (Public APIs)</span>
                            <span class="tree-chevron expanded" id="chev-grp-apis-public">▶</span>
                        </div>
                        <div id="grp-apis-public">
                            ${APP_DATA.apis.filter(a => a.authRequirement.includes('Public')).map(a => `
                                <div class="tree-node tree-subnode ${activeView.type === 'api' && activeView.id === a.id ? 'active' : ''}" onclick="showApi('${a.id}')">
                                    <span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span>
                                    <span title="${a.endpoint}">${a.endpoint}</span>
                                </div>
                            `).join('')}
                        </div>

                        <!-- 3.4 หลังเข้าสู่ระบบ (Authenticated APIs by Roles) -->
                        <div class="tree-group-title" style="padding-left:20px; font-size:10.5px; color:#2563eb;" onclick="toggleGroup('grp-apis-auth')">
                            <span>3.4 หลังเข้าสู่ระบบ (Authenticated)</span>
                            <span class="tree-chevron expanded" id="chev-grp-apis-auth">▶</span>
                        </div>
                        <div id="grp-apis-auth">
                            <!-- Superadmin APIs -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-a-superadmin')">
                                <span>Superadmin (${APP_DATA.apis.filter(a => a.allowedRoles.includes('superadmin')).length})</span>
                                <span class="tree-chevron expanded" id="chev-grp-a-superadmin">▶</span>
                            </div>
                            <div id="grp-a-superadmin">
                                ${APP_DATA.apis.filter(a => a.allowedRoles.includes('superadmin')).map(a => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'api' && activeView.id === a.id ? 'active' : ''}" style="padding-left:44px;" onclick="showApi('${a.id}')">
                                        <span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span>
                                        <span title="${a.endpoint}">${a.endpoint}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- Administrator APIs -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-a-admin')">
                                <span>Administrator (${APP_DATA.apis.filter(a => a.allowedRoles.includes('admin') || a.allowedRoles.includes('adminenvocc')).length})</span>
                                <span class="tree-chevron" id="chev-grp-a-admin">▶</span>
                            </div>
                            <div id="grp-a-admin" style="display:none;">
                                ${APP_DATA.apis.filter(a => a.allowedRoles.includes('admin') || a.allowedRoles.includes('adminenvocc')).map(a => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'api' && activeView.id === a.id ? 'active' : ''}" style="padding-left:44px;" onclick="showApi('${a.id}')">
                                        <span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span>
                                        <span title="${a.endpoint}">${a.endpoint}</span>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- User APIs -->
                            <div class="tree-group-title" style="padding-left:30px; font-size:10px; color:#475569;" onclick="toggleGroup('grp-a-user')">
                                <span>General User & Officers (${APP_DATA.apis.filter(a => a.allowedRoles.includes('user')).length})</span>
                                <span class="tree-chevron" id="chev-grp-a-user">▶</span>
                            </div>
                            <div id="grp-a-user" style="display:none;">
                                ${APP_DATA.apis.filter(a => a.allowedRoles.includes('user')).map(a => `
                                    <div class="tree-node tree-subnode ${activeView.type === 'api' && activeView.id === a.id ? 'active' : ''}" style="padding-left:44px;" onclick="showApi('${a.id}')">
                                        <span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span>
                                        <span title="${a.endpoint}">${a.endpoint}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Impact Analysis Menu
            html += `
                <div class="tree-node ${activeView.type === 'impact' ? 'active' : ''}" onclick="showImpactAnalysis()">
                    <span>🎯</span>
                    <span>Impact Analysis (วิเคราะห์ผลกระทบ)</span>
                </div>
            `;

            container.innerHTML = html;
        }

        function toggleGroup(id) {
            const el = document.getElementById(id);
            const chev = document.getElementById('chev-' + id);
            if (!el) return;
            if (el.style.display === 'none') {
                el.style.display = 'block';
                if (chev) chev.classList.add('expanded');
            } else {
                el.style.display = 'none';
                if (chev) chev.classList.remove('expanded');
            }
        }

        // --- 3. OVERVIEW VIEW RENDERING ---
        function showOverview() {
            activeView = { type: 'overview', id: null };
            renderSidebar();
            const canvas = document.getElementById('main-content-view');

            const o = APP_DATA.overview;
            canvas.innerHTML = `
                <div class="content-breadcrumbs">
                    <span>Overview</span> / <span>ระบบเฝ้าระวังมลพิษทางอากาศและสุขภาพ</span>
                </div>

                <div class="entity-header">
                    <div>
                        <div class="entity-title-row">
                            <h1 class="entity-title">${o.systemName}</h1>
                        </div>
                        <div style="font-size:14px; color:var(--primary); font-weight:600; margin-bottom:8px;">
                            ${o.systemThaiName}
                        </div>
                        <p class="entity-desc">${o.description}</p>
                    </div>
                </div>

                <!-- Tech Stack Section -->
                <div class="info-card">
                    <div class="info-card-title">💻 Technology Stack (สถาปัตยกรรมเทคโนโลยีที่ใช้งานจริง)</div>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Layer / หน้าที่</th><th>เทคโนโลยีและเวอร์ชัน</th></tr>
                        </thead>
                        <tbody>
                            ${o.techStack.map(t => `
                                <tr>
                                    <td style="font-weight:600; width:220px;">${t.layer}</td>
                                    <td><code>${t.technology}</code></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Code Structure Section -->
                <div class="info-card">
                    <div class="info-card-title">📁 โครงสร้าง Source Code สำคัญใน Repository</div>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Directory / File Path</th><th>หน้าที่การทำงาน</th></tr>
                        </thead>
                        <tbody>
                            ${o.codeStructure.map(c => `
                                <tr>
                                    <td style="width:280px;"><code>${c.path}</code></td>
                                    <td>${c.desc}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Roles Section -->
                <div class="info-card">
                    <div class="info-card-title">🔐 สิทธิ์และบทบาทผู้ใช้งานในระบบ (RBAC Roles)</div>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Role Key</th><th>ชื่อบทบาท (Label)</th><th>ขอบเขตและหน้าที่ (Scope & Permissions)</th></tr>
                        </thead>
                        <tbody>
                            ${o.userRoles.map(r => `
                                <tr>
                                    <td><code>${r.role}</code></td>
                                    <td style="font-weight:600;">${r.label}</td>
                                    <td>${r.desc}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // --- 4. PAGE DETAIL VIEW (Section 4) ---
        function showPage(pageId) {
            const p = APP_DATA.pages.find(x => x.id === pageId);
            if (!p) return;

            activeView = { type: 'page', id: pageId };
            renderSidebar();
            const canvas = document.getElementById('main-content-view');

            const funcsRows = (p.functions || []).map(f => `
                <tr>
                    <td><strong class="field-name">${f.name}</strong></td>
                    <td>${f.trigger || '-'}</td>
                    <td>${f.description || '-'}</td>
                    <td><code>${f.sourceFile || '-'}</code></td>
                    <td><span class="field-type">${f.input || '-'}</span></td>
                    <td>${f.validation || '-'}</td>
                    <td>${f.output || '-'}</td>
                    <td>${f.stateChanges || '-'}</td>
                    <td>${f.errorHandling || '-'}</td>
                </tr>
            `).join('') || '<tr><td colspan="9" style="color:var(--text-light);">ไม่มีฟังก์ชันที่ระบุ</td></tr>';

            const apisRows = (p.relatedApis || []).map(a => `
                <tr>
                    <td><span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span></td>
                    <td>
                        <a href="javascript:void(0)" onclick="navigateToApi('${a.endpoint}')" style="color:var(--primary); font-family:var(--font-mono); text-decoration:none; font-weight:600;">
                            ${a.endpoint} ↗
                        </a>
                    </td>
                    <td><code>${a.functionName || '-'}</code></td>
                    <td>${a.trigger || '-'}</td>
                    <td><code>${a.requestSent || '-'}</code></td>
                    <td>${a.responseUsed || '-'}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="color:var(--text-light);">หน้านี้ไม่มีการเรียก API โดยตรง</td></tr>';

            canvas.innerHTML = `
                <div class="content-breadcrumbs">
                    <span>PAGES</span> / <span>${p.authRequirement.includes('Public') ? 'Public' : 'Authenticated'}</span> / <span>${p.path}</span>
                </div>

                <div class="entity-header">
                    <div>
                        <div class="entity-title-row">
                            <span class="method-tag method-PAGE" style="font-size:12px; padding:2px 8px;">PAGE</span>
                            <h1 class="entity-title">${p.name}</h1>
                        </div>
                        <div class="entity-endpoint-box">
                            <span>URL Path:</span>
                            <strong style="color:var(--primary);">${p.path}</strong>
                            <button class="btn-copy" onclick="copyText('${p.path}')">Copy</button>
                        </div>
                        <p class="entity-desc">${p.description}</p>
                    </div>
                    <div>
                        <button class="btn btn-default" onclick="openEditModal('page', '${p.id}')">✏️ Edit Page</button>
                    </div>
                </div>

                <!-- Page Information -->
                <div class="info-card">
                    <div class="info-card-title">📄 Page Information (ข้อมูลพื้นฐานของหน้า)</div>
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Page ID</span>
                            <span class="meta-value"><code>${p.id}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Source File Path</span>
                            <span class="meta-value"><code>${p.sourceFile}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Component Name</span>
                            <span class="meta-value"><code>${p.component}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Authentication Requirement</span>
                            <span class="meta-value">${p.authRequirement}</span>
                        </div>
                        <div class="meta-item" style="grid-column:1/-1;">
                            <span class="meta-label">Allowed User Roles</span>
                            <span class="meta-value">
                                ${(p.allowedRoles || []).map(r => `<span class="badge-verified" style="margin-right:4px;">${r}</span>`).join('')}
                            </span>
                        </div>
                        <div class="meta-item" style="grid-column:1/-1;">
                            <span class="meta-label">Related Pages & Redirects</span>
                            <span class="meta-value">
                                ${(p.relatedPages || []).map(rp => `<span style="margin-right:8px; color:var(--primary); font-family:var(--font-mono);">${rp}</span>`).join('')}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Functions Table -->
                <div class="info-card">
                    <div class="info-card-title">⚙️ Functions (ฟังก์ชันและการจัดการ State ภายในหน้า)</div>
                    <div style="overflow-x:auto;">
                        <table class="apidog-table">
                            <thead>
                                <tr>
                                    <th>Function Name</th>
                                    <th>Trigger</th>
                                    <th>Description</th>
                                    <th>Source File</th>
                                    <th>Input</th>
                                    <th>Validation</th>
                                    <th>Output</th>
                                    <th>State Changes</th>
                                    <th>Error Handling</th>
                                </tr>
                            </thead>
                            <tbody>${funcsRows}</tbody>
                        </table>
                    </div>
                </div>

                <!-- Related APIs Table -->
                <div class="info-card">
                    <div class="info-card-title">⚡ Related APIs (รายการ API ที่หน้านี้เรียกใช้งาน)</div>
                    <div style="overflow-x:auto;">
                        <table class="apidog-table">
                            <thead>
                                <tr>
                                    <th>HTTP Method</th>
                                    <th>API Endpoint</th>
                                    <th>Calling Function</th>
                                    <th>Trigger</th>
                                    <th>Request Payload</th>
                                    <th>Response Utilized</th>
                                </tr>
                            </thead>
                            <tbody>${apisRows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // --- 5. API DETAIL VIEW (Section 5) ---
        function showApi(apiId) {
            const a = APP_DATA.apis.find(x => x.id === apiId);
            if (!a) return;

            activeView = { type: 'api', id: apiId };
            renderSidebar();
            const canvas = document.getElementById('main-content-view');

            const headersRows = (a.request?.headers || []).map(h => `
                <tr>
                    <td><strong class="field-name">${h.name}</strong></td>
                    <td><span class="field-type">${h.type}</span></td>
                    <td>${h.required ? '<span class="req-tag">Required</span>' : '<span class="opt-tag">Optional</span>'}</td>
                    <td><code>${h.defaultVal || '-'}</code></td>
                    <td>${h.desc}</td>
                    <td>${h.validation || '-'}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="color:var(--text-light);">ไม่มี Header พิเศษ</td></tr>';

            const queryRows = (a.request?.queryParams || []).map(q => `
                <tr>
                    <td><strong class="field-name">${q.name}</strong></td>
                    <td><span class="field-type">${q.type}</span></td>
                    <td>${q.required ? '<span class="req-tag">Required</span>' : '<span class="opt-tag">Optional</span>'}</td>
                    <td><code>${q.defaultVal || '-'}</code></td>
                    <td>${q.desc}</td>
                    <td>${q.validation || '-'}</td>
                </tr>
            `).join('');

            const bodyRows = (a.request?.bodyParams || []).map(b => `
                <tr>
                    <td><strong class="field-name">${b.name}</strong></td>
                    <td><span class="field-type">${b.type}</span></td>
                    <td>${b.required ? '<span class="req-tag">Required</span>' : '<span class="opt-tag">Optional</span>'}</td>
                    <td><code>${b.defaultVal || '-'}</code></td>
                    <td>${b.desc}</td>
                    <td>${b.validation || '-'}</td>
                </tr>
            `).join('');

            const respFieldsRows = (a.response?.fields || []).map(f => `
                <tr>
                    <td><strong class="field-name">${f.name}</strong></td>
                    <td><span class="field-type">${f.type}</span></td>
                    <td>${f.nullable ? '<span class="opt-tag">Nullable</span>' : '<span class="req-tag">Not Null</span>'}</td>
                    <td>${f.desc || '-'}</td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="color:var(--text-light);">Standard JSON payload</td></tr>';

            const usedByRows = (a.usedByPages || []).map(u => `
                <tr>
                    <td>
                        <a href="javascript:void(0)" onclick="navigateToPage('${u.pagePath}')" style="color:var(--primary); font-weight:600; text-decoration:none;">
                            ${u.pagePath} ↗
                        </a>
                    </td>
                    <td>${u.pageName || '-'}</td>
                    <td><code>${u.functionName || '-'}</code></td>
                </tr>
            `).join('') || '<tr><td colspan="3" style="color:var(--text-light);">ไม่พบการเรียกใช้ในหน้าเว็บหลัก</td></tr>';

            canvas.innerHTML = `
                <div class="content-breadcrumbs">
                    <span>APIS</span> / <span>${a.authRequirement.includes('Public') ? 'Public' : 'Authenticated'}</span> / <span>${a.endpoint}</span>
                </div>

                <div class="entity-header">
                    <div>
                        <div class="entity-title-row">
                            <span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}" style="font-size:12px; padding:3px 8px;">${a.method}</span>
                            <h1 class="entity-title">${a.name}</h1>
                        </div>
                        <div class="entity-endpoint-box">
                            <span>Base URL + Path:</span>
                            <strong style="color:var(--text-main);">${a.endpoint}</strong>
                            <button class="btn-copy" onclick="copyText('${a.endpoint}')">Copy</button>
                        </div>
                        <p class="entity-desc">${a.description}</p>
                    </div>
                    <div>
                        <button class="btn btn-default" onclick="openEditModal('api', '${a.id}')">✏️ Edit API</button>
                    </div>
                </div>

                <!-- API Information Card -->
                <div class="info-card">
                    <div class="info-card-title">⚡ API Information (ข้อกำหนดพื้นฐานของ API)</div>
                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">API ID</span>
                            <span class="meta-value"><code>${a.id}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">HTTP Method</span>
                            <span class="meta-value"><span class="method-tag method-${a.method.replace('Server Action', 'ACTION')}">${a.method}</span></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Authentication Type</span>
                            <span class="meta-value">${a.authRequirement}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Backend Source File</span>
                            <span class="meta-value"><code>${a.backendSourceFile}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Calling Function</span>
                            <span class="meta-value"><code>${a.callingFunction}</code></span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Frontend Caller File</span>
                            <span class="meta-value"><code>${a.frontendSourceFile}</code></span>
                        </div>
                        <div class="meta-item" style="grid-column:1/-1;">
                            <span class="meta-label">Allowed User Roles</span>
                            <span class="meta-value">
                                ${(a.allowedRoles || []).map(r => `<span class="badge-verified" style="margin-right:4px;">${r}</span>`).join('')}
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Request Section -->
                <div class="info-card">
                    <div class="info-card-title">📥 Request (พารามิเตอร์และข้อมูลที่ส่งเข้า)</div>
                    
                    ${queryRows ? `
                        <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Query Parameters:</h4>
                        <table class="apidog-table">
                            <thead>
                                <tr><th>Parameter Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th><th>Validation</th></tr>
                            </thead>
                            <tbody>${queryRows}</tbody>
                        </table>
                    ` : ''}

                    ${bodyRows ? `
                        <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Request Body (JSON / FormData):</h4>
                        <table class="apidog-table">
                            <thead>
                                <tr><th>Field Name</th><th>Type</th><th>Required</th><th>Default</th><th>Description</th><th>Validation Rules</th></tr>
                            </thead>
                            <tbody>${bodyRows}</tbody>
                        </table>
                    ` : ''}

                    <div class="code-box">
                        <div class="code-header">
                            <span>Request Example (JSON)</span>
                            <button class="btn-copy" onclick="copyCode(this)">Copy JSON</button>
                        </div>
                        <div class="code-content">${escapeHtml(a.request?.exampleJson || '{}')}</div>
                    </div>
                </div>

                <!-- Response Section -->
                <div class="info-card">
                    <div class="info-card-title">📤 Response (ผลลัพธ์และรูปแบบข้อมูลที่ตอบกลับ)</div>
                    <div style="margin-bottom:12px; display:flex; align-items:center; gap:10px;">
                        <span style="font-size:12px; color:var(--text-muted);">HTTP Status:</span>
                        <span class="badge-verified" style="font-size:12px;">${a.response?.statusCode || '200 OK'}</span>
                    </div>

                    <h4 style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Response Field Schema:</h4>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Field Name</th><th>Type</th><th>Nullable</th><th>Description</th></tr>
                        </thead>
                        <tbody>${respFieldsRows}</tbody>
                    </table>

                    <div class="code-box">
                        <div class="code-header">
                            <span>Response Example (Success JSON)</span>
                            <button class="btn-copy" onclick="copyCode(this)">Copy JSON</button>
                        </div>
                        <div class="code-content">${escapeHtml(a.response?.exampleJson || '{}')}</div>
                    </div>
                </div>

                <!-- Used By Pages -->
                <div class="info-card">
                    <div class="info-card-title">🖥️ Used By Pages (หน้าเว็บที่เรียกใช้ API นี้)</div>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Page URL Path</th><th>Page Name</th><th>Calling Function</th></tr>
                        </thead>
                        <tbody>${usedByRows}</tbody>
                    </table>
                </div>

                <!-- Data Operations -->
                <div class="info-card">
                    <div class="info-card-title">🗄️ Data Operations (การอ่าน-เขียนฐานข้อมูล)</div>
                    <p style="font-size:13px; color:var(--text-main); margin-bottom:8px;">
                        <strong>Action Type:</strong> <code>${a.dataOperations?.action || 'SELECT'}</code>
                    </p>
                    <p style="font-size:13px; color:var(--text-main); margin-bottom:8px;">
                        <strong>Target Tables / Files:</strong> <code>${(a.dataOperations?.tables || []).join(', ')}</code>
                    </p>
                    <p style="font-size:13px; color:var(--text-muted);">
                        ${a.dataOperations?.description || '-'}
                    </p>
                </div>
            `;
        }

        // --- 6. IMPACT ANALYSIS VIEW (Section 6) ---
        function showImpactAnalysis() {
            activeView = { type: 'impact', id: null };
            renderSidebar();
            const canvas = document.getElementById('main-content-view');

            const allTargets = [
                ...APP_DATA.pages.map(p => ({ id: p.id, label: `Page: ${p.path} (${p.name})`, type: 'page', entity: p })),
                ...APP_DATA.apis.map(a => ({ id: a.id, label: `API: ${a.endpoint} [${a.method}]`, type: 'api', entity: a })),
                ...APP_DATA.fields.map(f => ({ id: f.name, label: `Field: ${f.name} (${f.tables.join(', ')})`, type: 'field', entity: f }))
            ];

            canvas.innerHTML = `
                <div class="content-breadcrumbs">
                    <span>Impact Analysis</span> / <span>วิเคราะห์ผลกระทบจากการแก้ไขระบบ</span>
                </div>

                <div class="entity-header">
                    <div>
                        <div class="entity-title-row">
                            <span style="font-size:20px;">🎯</span>
                            <h1 class="entity-title">Impact Analysis — วิเคราะห์ผลกระทบจากการแก้ไขระบบ</h1>
                        </div>
                        <p class="entity-desc">
                            ตรวจสอบความสัมพันธ์และประเมินผลกระทบก่อนเริ่มแก้ไข Source Code เพื่อป้องกัน Regression และ Breaking Changes
                        </p>
                    </div>
                </div>

                <div class="disclaimer-banner">
                    <span>⚠️</span>
                    <span><strong>หลักเกณฑ์:</strong> ระบบแยกผลกระทบที่ตรวจสอบพบจริงจาก Source Code (Verified) ออกจากผลกระทบคาดการณ์ (Inferred) อย่างเคร่งครัด</span>
                </div>

                <!-- Selector Toolbar -->
                <div class="info-card" style="padding:14px 18px; margin-bottom:18px;">
                    <label style="font-size:12px; font-weight:700; color:var(--text-muted); display:block; margin-bottom:6px;">
                        เลือก Page, API หรือ Field ที่ต้องการวิเคราะห์ผลกระทบ:
                    </label>
                    <select id="impact-target-select" class="form-input" style="font-size:13.5px; height:36px;" onchange="renderImpactTarget(this.value)">
                        ${allTargets.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
                    </select>
                </div>

                <div id="impact-target-result">
                    <!-- Loaded dynamically -->
                </div>
            `;

            renderImpactTarget(allTargets[0].id);
        }

        function renderImpactTarget(targetId) {
            const container = document.getElementById('impact-target-result');
            if (!container) return;

            const page = APP_DATA.pages.find(p => p.id === targetId);
            const api = APP_DATA.apis.find(a => a.id === targetId);
            const field = APP_DATA.fields.find(f => f.name === targetId);

            let flowHtml = '';
            let directs = [];
            let indirects = [];
            let sources = [];
            let tests = [];
            let riskLevel = 'MEDIUM';
            let riskReason = '';

            if (page) {
                riskLevel = page.riskLevel || 'HIGH';
                riskReason = page.riskReason || 'การแก้ไขหน้านี้อาจกระทบต่อการนำเสนอข้อมูลสุขภาพและการทำงานของคอมโพเนนต์ร่วม';
                flowHtml = `
                    <div class="flow-step-box highlight">
                        <div class="flow-step-title">1. Target Page</div>
                        <div class="flow-step-val">${page.path}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">2. Functions</div>
                        <div class="flow-step-val">${(page.functions || []).map(f => f.name).slice(0, 2).join(', ') || 'Handlers'}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">3. Called APIs</div>
                        <div class="flow-step-val">${(page.relatedApis || []).map(a => a.endpoint).slice(0, 2).join(', ') || 'Local Actions'}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">4. Database</div>
                        <div class="flow-step-val">PostgreSQL & DuckDB</div>
                    </div>
                `;

                directs = [
                    { target: page.sourceFile, detail: "คอมโพเนนต์หลักที่ต้องแก้ไข (Direct Source File)" },
                    { target: (page.relatedPages || []).join(', ') || 'Navigation links', detail: "การเชื่อมต่อ Redirect และ Navigation Flow" }
                ];
                indirects = [
                    { target: "Shared Components (" + (page.component || 'Layout') + ")", detail: "อาจกระทบหน้าอื่นที่ใช้คอมโพเนนต์หรือเลย์เอาต์ร่วมกัน" }
                ];
                sources = [{ path: page.sourceFile, lines: "All", role: "Page Component" }];
                tests = [
                    `เปิดหน้า ${page.path} ตรวจสอบการเรนเดอร์ UI และสิทธิ์ Allowed Roles`,
                    `ทดสอบการทำงานของฟังก์ชัน ${(page.functions || []).map(f => f.name).join(', ')}`
                ];
            } else if (api) {
                riskLevel = api.riskLevel || 'HIGH';
                riskReason = api.riskReason || 'การแก้ไข API จะกระทบต่อหน้าเว็บที่เรียกใช้งานและการประมวลผลข้อมูลในฐานข้อมูล';
                flowHtml = `
                    <div class="flow-step-box">
                        <div class="flow-step-title">1. Caller Pages</div>
                        <div class="flow-step-val">${(api.usedByPages || []).map(u => u.pagePath).join(', ') || 'Direct Callers'}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">2. Calling Function</div>
                        <div class="flow-step-val">${api.callingFunction || 'Client fetch()'}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box highlight">
                        <div class="flow-step-title">3. Target API</div>
                        <div class="flow-step-val">${api.endpoint} [${api.method}]</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">4. Database / Tables</div>
                        <div class="flow-step-val">${(api.dataOperations?.tables || []).join(', ')}</div>
                    </div>
                `;

                directs = (api.usedByPages || []).map(u => ({
                    target: `Page: ${u.pagePath} (${u.functionName})`,
                    detail: "จะได้รับผลกระทบทันทีหากเปลี่ยนชื่อ Endpoint, Parameter หรือ Response JSON"
                }));
                indirects = [
                    { target: "Database Data Operations (" + (api.dataOperations?.action || 'CRUD') + ")", detail: "กระทบต่อความสมบูรณ์ของข้อมูลใน " + (api.dataOperations?.tables || []).join(', ') }
                ];
                sources = [
                    { path: api.backendSourceFile, lines: "API Route", role: "Backend Handler" },
                    { path: api.frontendSourceFile, lines: "Caller", role: "Frontend UI Component" }
                ];
                tests = [
                    `ทดสอบส่ง Request ถูกต้อง ต้องได้รับ HTTP Status 200 OK`,
                    `ทดสอบส่ง Request ฟิลด์ผิดหรือขาดหาย ต้องได้รับ HTTP 400 พร้อมแจ้งเตือน Validation`,
                    `ทดสอบสิทธิ์ Allowed Roles ${(api.allowedRoles || []).join(', ')}`
                ];
            } else if (field) {
                riskLevel = field.riskLevel || 'HIGH';
                riskReason = field.riskReason || 'การแก้ไขฟิลด์กระทบต่อโครงสร้างฐานข้อมูลและ Zod Validation';
                flowHtml = `
                    <div class="flow-step-box">
                        <div class="flow-step-title">1. Consumer Pages</div>
                        <div class="flow-step-val">${field.pages.slice(0, 3).join(', ')}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">2. Functions</div>
                        <div class="flow-step-val">${field.functions.map(f => f.name).slice(0, 2).join(', ')}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box">
                        <div class="flow-step-title">3. APIs Involved</div>
                        <div class="flow-step-val">${field.apis.map(a => a.api).slice(0, 2).join(', ')}</div>
                    </div>
                    <div class="flow-arrow">➔</div>
                    <div class="flow-step-box highlight">
                        <div class="flow-step-title">4. Target Field</div>
                        <div class="flow-step-val">${field.name} (${field.tables.join(', ')})</div>
                    </div>
                `;

                directs = (field.directImpacts || []).map(d => ({ target: d.target, detail: d.detail }));
                indirects = (field.indirectImpacts || []).map(i => ({ target: i.target, detail: i.detail }));
                sources = field.sourceFiles || [];
                tests = field.testCases || [];
            }

            container.innerHTML = `
                <!-- Dependency Flow: Page -> Function -> API -> Database -->
                <div class="flow-container">
                    <div style="font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:12px;">
                        แผนภาพลำดับความสัมพันธ์: Page → Function → API → Database
                    </div>
                    <div class="flow-steps">${flowHtml}</div>
                </div>

                <!-- Risk Level Assessment -->
                <div class="info-card" style="border-left:4px solid ${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'var(--delete-color)' : (riskLevel === 'MEDIUM' ? 'var(--put-color)' : 'var(--get-color)')};">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div class="info-card-title" style="margin-bottom:0;">🚨 ระดับความเสี่ยงจากการแก้ไข (Risk Level Assessment)</div>
                        <span class="method-tag method-${riskLevel === 'CRITICAL' || riskLevel === 'HIGH' ? 'DELETE' : (riskLevel === 'MEDIUM' ? 'PUT' : 'GET')}" style="font-size:12px; font-weight:700; padding:4px 10px;">
                            ระดับความเสี่ยง: ${riskLevel}
                        </span>
                    </div>
                    <p style="font-size:13px; color:var(--text-main); line-height:1.6; white-space:pre-line;">
                        <strong>เหตุผลประกอบการประเมิน (Rationale):</strong> ${riskReason}
                    </p>
                </div>

                <!-- Strict Impact Split -->
                <div class="impact-split">
                    <div class="impact-col" style="border-top:3px solid var(--get-color);">
                        <div class="impact-col-header" style="color:var(--get-color);">
                            <span>✓ รายการที่ได้รับผลกระทบโดยตรง</span>
                            <span class="badge-verified">Verified (พบจริงจากโค้ด)</span>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                            พิสูจน์ได้จาก AST, การ Import, Function Calls, และ SQL Queries
                        </div>
                        ${directs.map(d => `
                            <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:8px 12px; margin-bottom:8px;">
                                <strong style="font-size:13px; color:var(--text-main);">${d.target}</strong>
                                <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">${d.detail}</p>
                            </div>
                        `).join('') || '<p style="color:var(--text-light); font-size:12px;">ไม่มีผลกระทบตรงที่ระบุ</p>'}
                    </div>

                    <div class="impact-col" style="border-top:3px solid var(--put-color);">
                        <div class="impact-col-header" style="color:var(--put-color);">
                            <span>⚡ รายการที่อาจได้รับผลกระทบทางอ้อม</span>
                            <span class="badge-inferred">Inferred (คาดการณ์เชิงสถาปัตยกรรม)</span>
                        </div>
                        <div style="font-size:12px; color:var(--text-muted); margin-bottom:12px;">
                            ผลกระทบทางอ้อม การซิงค์ข้อมูล Airflow หรือความเสี่ยงความปลอดภัย
                        </div>
                        ${indirects.map(i => `
                            <div style="background:#f8fafc; border:1px solid var(--border-color); border-radius:6px; padding:8px 12px; margin-bottom:8px;">
                                <strong style="font-size:13px; color:var(--text-main);">${i.target}</strong>
                                <p style="font-size:12px; color:var(--text-muted); margin-top:2px;">${i.detail}</p>
                            </div>
                        `).join('') || '<p style="color:var(--text-light); font-size:12px;">ไม่มีผลกระทบทางอ้อมเพิ่มเติม</p>'}
                    </div>
                </div>

                <!-- Source Files to Inspect -->
                <div class="info-card">
                    <div class="info-card-title">📁 Source Files ที่ควรตรวจสอบก่อนและหลังการแก้ไข</div>
                    <table class="apidog-table">
                        <thead>
                            <tr><th>Source File Path</th><th>ช่วงบรรทัด</th><th>หน้าที่ในระบบ</th></tr>
                        </thead>
                        <tbody>
                            ${sources.map(s => `
                                <tr>
                                    <td><code>${s.path}</code></td>
                                    <td><span class="field-type">${s.lines || 'All'}</span></td>
                                    <td>${s.role || s.desc || 'Source Implementation'}</td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" style="color:var(--text-light);">ไม่มีไฟล์เฉพาะ</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <!-- Test Guidelines -->
                <div class="info-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <div class="info-card-title" style="margin-bottom:0;">🧪 แนวทางและขั้นตอนทดสอบหลังแก้ไข (Test Guidelines)</div>
                        <button class="btn btn-default" onclick="copyChecklistText()">📋 Copy รายการตรวจสอบ (Checklist)</button>
                    </div>
                    <div id="test-checklist-box">
                        ${tests.map((t, idx) => `
                            <div style="padding:6px 0; display:flex; align-items:flex-start; gap:8px;">
                                <input type="checkbox" id="chk-${idx}" style="margin-top:3px; cursor:pointer;">
                                <label for="chk-${idx}" style="font-size:13px; color:var(--text-main); cursor:pointer;">${t}</label>
                            </div>
                        `).join('') || '<p style="color:var(--text-light); font-size:12px;">ไม่มีขั้นตอนทดสอบเฉพาะ</p>'}
                    </div>
                </div>
            `;
        }

        // --- 7. GLOBAL SEARCH SYSTEM (Section 7) ---
        function handleGlobalSearch(query) {
            const box = document.getElementById('search-results-box');
            const q = query.toLowerCase().trim();

            if (!q) {
                box.classList.remove('open');
                box.innerHTML = '';
                return;
            }

            const results = [];

            // Search Pages
            APP_DATA.pages.forEach(p => {
                const pName = (p.name || '').toLowerCase();
                const pPath = (p.path || p.endpoint || '').toLowerCase();
                const pFile = (p.sourceFile || '').toLowerCase();
                if (pName.includes(q) || pPath.includes(q) || pFile.includes(q)) {
                    results.push({ type: 'Page', title: `${p.path || p.endpoint} — ${p.name}`, sub: p.sourceFile, id: p.id, action: () => showPage(p.id) });
                }
                (p.functions || []).forEach(f => {
                    const fName = (f.name || '').toLowerCase();
                    const fDesc = (f.description || '').toLowerCase();
                    if (fName.includes(q) || fDesc.includes(q)) {
                        results.push({ type: 'Function', title: `${f.name} in ${p.path || p.endpoint}`, sub: f.sourceFile, id: p.id, action: () => showPage(p.id) });
                    }
                });
            });

            // Search APIs
            APP_DATA.apis.forEach(a => {
                const aName = (a.name || '').toLowerCase();
                const aEnd = (a.endpoint || '').toLowerCase();
                const aFile = (a.backendSourceFile || a.sourceFile || '').toLowerCase();
                if (aName.includes(q) || aEnd.includes(q) || aFile.includes(q)) {
                    results.push({ type: 'API', title: `${a.method} ${a.endpoint}`, sub: a.name, id: a.id, action: () => showApi(a.id) });
                }
                (a.request?.bodyParams || []).forEach(b => {
                    const bName = (b.name || '').toLowerCase();
                    if (bName.includes(q)) {
                        results.push({ type: 'Request Field', title: `Field: ${b.name} in ${a.endpoint}`, sub: b.desc, id: a.id, action: () => showApi(a.id) });
                    }
                });
            });

            if (results.length === 0) {
                box.innerHTML = '<div style="padding:12px; font-size:12px; color:var(--text-muted); text-align:center;">ไม่พบข้อมูลที่ตรงกับคำค้นหา</div>';
            } else {
                box.innerHTML = results.slice(0, 15).map(r => `
                    <div class="search-result-item" onclick="executeSearchResult(${results.indexOf(r)})">
                        <div>
                            <div class="search-result-title">${r.title}</div>
                            <div class="search-result-sub">${r.sub || ''}</div>
                        </div>
                        <span class="field-type">${r.type}</span>
                    </div>
                `).join('');
                window.__currentSearchResults = results;
            }
            box.classList.add('open');
        }

        function executeSearchResult(index) {
            const item = window.__currentSearchResults[index];
            if (item && item.action) {
                item.action();
                document.getElementById('search-results-box').classList.remove('open');
                document.getElementById('global-search').value = '';
            }
        }

        // --- 8. IN-FILE EDITING & EXPORT SYSTEM (Section 8) ---
        let currentEditTarget = null;

        function openEditModal(type, id) {
            currentEditTarget = { type, id };
            const modal = document.getElementById('edit-modal');
            const title = document.getElementById('modal-title');
            const form = document.getElementById('modal-form-container');

            const disclaimerBanner = `
                <div class="disclaimer-banner" style="margin-bottom:14px;">
                    <span>⚠️</span>
                    <span><strong>ข้อควรระวัง:</strong> ข้อมูลถูกบันทึกชั่วคราวในหน่วยความจำ/เบราว์เซอร์ กรุณากด "Export HTML" หรือ "Export JSON" เพื่อบันทึกถาวร</span>
                </div>
            `;

            if (type === 'page') {
                const p = APP_DATA.pages.find(x => x.id === id);
                title.innerText = `แก้ไขข้อมูล Page: ${p.path}`;
                form.innerHTML = disclaimerBanner + `
                    <div class="form-group">
                        <label class="form-label">ชื่อหน้า (Page Name)</label>
                        <input type="text" id="edit-p-name" class="form-input" value="${escapeHtml(p.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">URL Path</label>
                        <input type="text" id="edit-p-path" class="form-input" value="${escapeHtml(p.path)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">คำอธิบาย (Description)</label>
                        <textarea id="edit-p-desc" class="form-textarea">${escapeHtml(p.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Source File Path</label>
                        <input type="text" id="edit-p-file" class="form-input" value="${escapeHtml(p.sourceFile)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Allowed User Roles (คั่นด้วยเครื่องหมายจุลภาค)</label>
                        <input type="text" id="edit-p-roles" class="form-input" value="${(p.allowedRoles || []).join(', ')}">
                    </div>
                `;
            } else if (type === 'api') {
                const a = APP_DATA.apis.find(x => x.id === id);
                title.innerText = `แก้ไขข้อมูล API: ${a.endpoint}`;
                form.innerHTML = disclaimerBanner + `
                    <div class="form-group">
                        <label class="form-label">API Name / Title</label>
                        <input type="text" id="edit-a-name" class="form-input" value="${escapeHtml(a.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">HTTP Method</label>
                        <select id="edit-a-method" class="form-input">
                            <option value="GET" ${a.method === 'GET' ? 'selected' : ''}>GET</option>
                            <option value="POST" ${a.method === 'POST' ? 'selected' : ''}>POST</option>
                            <option value="PUT" ${a.method === 'PUT' ? 'selected' : ''}>PUT</option>
                            <option value="PATCH" ${a.method === 'PATCH' ? 'selected' : ''}>PATCH</option>
                            <option value="DELETE" ${a.method === 'DELETE' ? 'selected' : ''}>DELETE</option>
                            <option value="Server Action" ${a.method.includes('Action') ? 'selected' : ''}>Server Action</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Endpoint</label>
                        <input type="text" id="edit-a-endpoint" class="form-input" value="${escapeHtml(a.endpoint)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">คำอธิบาย (Description)</label>
                        <textarea id="edit-a-desc" class="form-textarea">${escapeHtml(a.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Allowed Roles (คั่นด้วยจุลภาค)</label>
                        <input type="text" id="edit-a-roles" class="form-input" value="${(a.allowedRoles || []).join(', ')}">
                    </div>
                `;
            }
            modal.classList.add('open');
        }

        function saveEntityEdit() {
            if (!currentEditTarget) return;

            if (currentEditTarget.type === 'new') {
                const addType = document.getElementById('add-type').value;
                const name = document.getElementById('add-name').value.trim();
                const pathVal = document.getElementById('add-path').value.trim();
                const desc = document.getElementById('add-desc').value.trim();
                if (!name || !pathVal) {
                    alert('กรุณากรอกชื่อรายการและ URL Path/Endpoint ให้ครบถ้วน');
                    return;
                }
                if (addType === 'page') {
                    const newId = 'page-' + Date.now();
                    const newPage = {
                        id: newId,
                        name: name,
                        path: pathVal,
                        sourceFile: 'web/src/app' + pathVal + '/page.tsx',
                        allowedRoles: ['superadmin', 'admin', 'user'],
                        description: desc || 'หน้าแสดงผลที่เพิ่มใหม่ในระบบ',
                        functions: [],
                        relatedApis: []
                    };
                    APP_DATA.pages.push(newPage);
                    renderSidebar();
                    showPage(newId);
                } else {
                    const newId = 'api-' + Date.now();
                    const method = (document.getElementById('add-method')?.value || 'GET').toUpperCase();
                    const newApi = {
                        id: newId,
                        name: name,
                        endpoint: pathVal,
                        method: method,
                        backendSourceFile: 'web/src/app' + pathVal + '/route.ts',
                        allowedRoles: ['superadmin', 'admin', 'user'],
                        description: desc || 'API Endpoint ที่เพิ่มใหม่ในระบบ',
                        request: { headers: [], queryParams: [], bodyParams: [] },
                        response: { successStatus: 200, exampleJson: '{}' }
                    };
                    APP_DATA.apis.push(newApi);
                    renderSidebar();
                    showApi(newId);
                }
                closeModal('edit-modal');
                showToast('⚠️ ข้อมูลถูกบันทึกชั่วคราวในหน่วยความจำ/เบราว์เซอร์ กรุณากด "Export HTML" หรือ "Export JSON" เพื่อบันทึกถาวร');
                return;
            }

            if (currentEditTarget.type === 'page') {
                const p = APP_DATA.pages.find(x => x.id === currentEditTarget.id);
                p.name = document.getElementById('edit-p-name').value;
                p.path = document.getElementById('edit-p-path').value;
                p.description = document.getElementById('edit-p-desc').value;
                p.sourceFile = document.getElementById('edit-p-file').value;
                p.allowedRoles = document.getElementById('edit-p-roles').value.split(',').map(s => s.trim()).filter(Boolean);
                showPage(p.id);
            } else if (currentEditTarget.type === 'api') {
                const a = APP_DATA.apis.find(x => x.id === currentEditTarget.id);
                a.name = document.getElementById('edit-a-name').value;
                a.method = document.getElementById('edit-a-method').value;
                a.endpoint = document.getElementById('edit-a-endpoint').value;
                a.description = document.getElementById('edit-a-desc').value;
                a.allowedRoles = document.getElementById('edit-a-roles').value.split(',').map(s => s.trim()).filter(Boolean);
                showApi(a.id);
            }

            closeModal('edit-modal');
            showToast('⚠️ ข้อมูลถูกบันทึกชั่วคราวในหน่วยความจำ/เบราว์เซอร์ กรุณากด "Export HTML" หรือ "Export JSON" เพื่อบันทึกถาวร');
        }

        function openAddModal() {
            const modal = document.getElementById('edit-modal');
            const title = document.getElementById('modal-title');
            const form = document.getElementById('modal-form-container');

            title.innerText = 'เพิ่ม Page หรือ API ใหม่';
            form.innerHTML = `
                <div class="disclaimer-banner" style="margin-bottom:12px;">
                    <span>⚠️</span>
                    <span><strong>ข้อควรระวัง:</strong> ข้อมูลถูกบันทึกชั่วคราวในหน่วยความจำ/เบราว์เซอร์ กรุณากด "Export HTML" หรือ "Export JSON" เพื่อบันทึกถาวร</span>
                </div>
                <div class="form-group">
                    <label class="form-label">ประเภทที่ต้องการเพิ่ม</label>
                    <select id="add-type" class="form-input" onchange="toggleAddType(this.value)">
                        <option value="page">Page (หน้าเว็บใหม่)</option>
                        <option value="api">API Endpoint (เอ็นด์พอยต์ใหม่)</option>
                    </select>
                </div>
                <div class="form-group" id="add-method-group" style="display:none;">
                    <label class="form-label">HTTP Method</label>
                    <select id="add-method" class="form-input">
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                        <option value="Server Action">Server Action</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">ชื่อรายการ (Name / Title)</label>
                    <input type="text" id="add-name" class="form-input" placeholder="เช่น รายงานวิเคราะห์ข้อมูลฝุ่น">
                </div>
                <div class="form-group">
                    <label class="form-label">URL Path / Endpoint</label>
                    <input type="text" id="add-path" class="form-input" placeholder="เช่น /dashboard/custom หรือ /api/custom">
                </div>
                <div class="form-group">
                    <label class="form-label">คำอธิบาย (Description)</label>
                    <textarea id="add-desc" class="form-textarea" placeholder="รายละเอียดหน้าที่การทำงาน..."></textarea>
                </div>
            `;

            currentEditTarget = { type: 'new' };
            modal.classList.add('open');
        }

        function toggleAddType(val) {
            const mg = document.getElementById('add-method-group');
            if (mg) {
                mg.style.display = (val === 'api') ? 'block' : 'none';
            }
        }

        function openImportModal() {
            document.getElementById('import-modal').classList.add('open');
        }

        function closeModal(id) {
            document.getElementById(id).classList.remove('open');
        }

        function exportJSON() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(APP_DATA, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", `EnvOcc_PM25_Documentation_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
            showToast('📤 ส่งออกข้อมูลเป็น JSON เรียบร้อยแล้ว');
        }

        // Section 8: Export HTML containing updated data
        function exportHTML() {
            const serializedData = JSON.stringify(APP_DATA, null, 2);
            let fullHtml = '<!DOCTYPE html>' + String.fromCharCode(10) + document.documentElement.outerHTML;

            const startMarker = '/* __DATA_START__ */';
            const endMarker = '/* __DATA_END__ */';
            const sIdx = fullHtml.indexOf(startMarker);
            const eIdx = fullHtml.indexOf(endMarker);
            if (sIdx !== -1 && eIdx !== -1) {
                fullHtml = fullHtml.slice(0, sIdx + startMarker.length) + String.fromCharCode(10) + '        let APP_DATA = ' + serializedData + ';' + String.fromCharCode(10) + '        ' + fullHtml.slice(eIdx);
            }

            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", url);
            dlAnchor.setAttribute("download", "EnvOcc_PM25_Technical_Documentation.html");
            document.body.appendChild(dlAnchor);
            dlAnchor.click();
            dlAnchor.remove();
            URL.revokeObjectURL(url);

            showToast('💾 ส่งออกไฟล์ HTML พร้อมข้อมูลล่าสุดเรียบร้อยแล้ว (เปิดใช้แบบ Offline ได้ทันที)');
        }

        function handleFileImport(evt) {
            const file = evt.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('import-json-text').value = e.target.result;
            };
            reader.readAsText(file);
        }

        function applyImportJSON() {
            const text = document.getElementById('import-json-text').value;
            try {
                const parsed = JSON.parse(text);
                if (parsed.pages && parsed.apis) {
                    APP_DATA = parsed;
                    renderSidebar();
                    showOverview();
                    closeModal('import-modal');
                    showToast('📥 นำเข้าข้อมูล JSON สำเร็จ');
                } else {
                    alert('โครงสร้าง JSON ไม่ตรงกับรูปแบบเอกสาร (ต้องมี pages และ apis)');
                }
            } catch (err) {
                alert('JSON ไม่ถูกต้อง: ' + err.message);
            }
        }

        // Navigation helpers
        function navigateToPage(path) {
            const p = APP_DATA.pages.find(x => x.path === path || x.name === path);
            if (p) showPage(p.id);
        }

        function navigateToApi(endpoint) {
            const a = APP_DATA.apis.find(x => x.endpoint === endpoint || x.name === endpoint);
            if (a) showApi(a.id);
        }

        // Clipboard helpers
        function copyText(txt) {
            navigator.clipboard.writeText(txt).then(() => showToast('📋 คัดลอกแล้ว: ' + txt));
        }

        function copyCode(btn) {
            const codeBox = btn.closest('.code-box');
            const content = codeBox.querySelector('.code-content').innerText;
            navigator.clipboard.writeText(content).then(() => showToast('📋 คัดลอก JSON แล้ว'));
        }

        function copyChecklistText() {
            const box = document.getElementById('test-checklist-box');
            const items = Array.from(box.querySelectorAll('label')).map(l => '- [ ] ' + l.innerText).join(String.fromCharCode(10));
            navigator.clipboard.writeText(items).then(() => showToast('📋 คัดลอก Checklist สำหรับทดสอบเรียบร้อยแล้ว'));
        }

        function showToast(msg) {
            const toast = document.getElementById('toast-popup');
            toast.innerText = msg;
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 3200);
        }

        function escapeHtml(str) {
            return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function filterSidebar(val) {
            renderSidebar(val);
        }

        // Keyboard Shortcut ⌘K / Ctrl+K
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('global-search').focus();
            }
        });

        // Click outside search results to close
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.header-search')) {
                document.getElementById('search-results-box').classList.remove('open');
            }
        });

        // Initialize App
        window.addEventListener('DOMContentLoaded', () => {
            renderSidebar();
            showOverview();
        });
    </script>
</body>
</html>
"""

# Replace placeholder with clean JSON string
final_html = html_template.replace("__APP_DATA_PLACEHOLDER__", data_json_str)

# Write to EnvOcc_PM25_Technical_Documentation.html (Root)
output_file_root = os.path.abspath('EnvOcc_PM25_Technical_Documentation.html')
with open(output_file_root, 'w', encoding='utf-8') as f:
    f.write(final_html)
print(f"Generated {output_file_root} ({len(final_html)} bytes)")

# Write to web/public/EnvOcc_PM25_Technical_Documentation.html
web_public_dir = os.path.abspath('web/public')
os.makedirs(web_public_dir, exist_ok=True)
output_file_public = os.path.join(web_public_dir, 'EnvOcc_PM25_Technical_Documentation.html')
with open(output_file_public, 'w', encoding='utf-8') as f:
    f.write(final_html)
print(f"Generated {output_file_public} ({len(final_html)} bytes)")

# Also write to documentation.html for backwards compatibility
output_doc_root = os.path.abspath('documentation.html')
with open(output_doc_root, 'w', encoding='utf-8') as f:
    f.write(final_html)
output_doc_public = os.path.join(web_public_dir, 'documentation.html')
with open(output_doc_public, 'w', encoding='utf-8') as f:
    f.write(final_html)
print("Synchronized documentation.html and web/public/documentation.html")

