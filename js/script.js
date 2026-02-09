/**
 * EmailExtract Pro - Main JavaScript File
 * Handles file uploads, email extraction, filtering, and export functionality
 */

/* ====== DOM Elements ====== */
const fileInput = document.getElementById('fileInput');
const dropArea = document.getElementById('dropArea');
const browseBtn = document.getElementById('browseBtn');
const fileList = document.getElementById('fileList');
const extractBtn = document.getElementById('extractBtn');
const exportBtn = document.getElementById('exportBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const emailsList = document.getElementById('emailsList');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsInfo = document.getElementById('resultsInfo');
const pagination = document.getElementById('pagination');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');

/* 🔍 SEARCH DOM (ADDED) */
const emailSearch = document.getElementById('emailSearch');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const copySelectedBtn = document.getElementById('copySelectedBtn');
const rowsPerPageSelect = document.getElementById('rowsPerPageSelect');

/* ☑ SELECT ALL CHECKBOX (ADDED) */
const selectAllEmails = document.getElementById('selectAllEmails');

/* ====== Application State ====== */
let files = [];
let emails = [];
let currentFilter = 'all';
let currentPage = 1;
let emailsPerPage = 20;

/* 🔍 SEARCH STATE (ADDED) */
let searchQuery = '';

/* 🔃 SORT STATE (ADDED) */
let sortColumn = null;      // email | status | domain | source
let sortDirection = 'asc'; // asc | desc

/* ☑ CHECKBOX STATE (ADDED) */
let selectedEmails = new Set();

/* 🚫 MANUALLY INVALID EMAILS (ADDED) */
const MANUALLY_INVALID_EMAILS = new Set([
    'example@example.com',
    'email@email.com',
    'john.doe@gmail.com',
    'user.name@gmail.com',
    'admin@domain.com',
    'support@company.co',
    'info@website.org',
    'contact@service.net',
    'hello@startup.io',
    'devraj.sah@kiit.ac.in',
    'student@college.edu',
    'sales@shop.in',
    'team.hr@business.com',
    'billing@paypal.com',
    'career@google.com',
    'news@bbc.co.uk',
    'alerts@banking.com',
    'official@mail.gov',
    'feedback@openai.com',
    'helpdesk@support.io',
    'noreply@system.com',
    'test@test.com',
    'user@user.com',
    'demo@demo.com',
    'sample@sample.com',
    'info@info.com',
    'admin@admin.com',
    'contact@contact.com',
    'hello@hello.com',
    'mail@mail.com',
    'support@support.com',
    'data@data.com',
    'code@code.com',
    'dev@dev.com',
    'cloud@cloud.com',
    'web@web.com',
    'app@app.com',
    'team@team.com',
    'service@service.com'


]);


/* ====== Event Listeners ====== */
document.addEventListener('DOMContentLoaded', initApp);

browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});
fileInput.addEventListener('change', handleFileSelect);
dropArea.addEventListener('click', () => fileInput.click());
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('drop', handleDrop);

extractBtn.addEventListener('click', extractEmails);
exportBtn.addEventListener('click', exportToCSV);
clearAllBtn.addEventListener('click', clearAllFiles);

prevBtn.addEventListener('click', goToPrevPage);
nextBtn.addEventListener('click', goToNextPage);

if (copySelectedBtn) {
    copySelectedBtn.addEventListener('click', copySelectedEmails);
}
if (rowsPerPageSelect) {
    rowsPerPageSelect.addEventListener('change', (e) => {
        emailsPerPage = parseInt(e.target.value, 10);
        currentPage = 1;
        displayEmails();
    });
}


/* 🔍 SEARCH LISTENER (ADDED) */
if (emailSearch) {
    emailSearch.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        currentPage = 1;
        displayEmails();
    });
}

/* ❌ CLEAR SEARCH BUTTON (ADDED) */
if (clearSearchBtn && emailSearch) {
    clearSearchBtn.addEventListener('click', () => {
        emailSearch.value = '';
        searchQuery = '';
        currentPage = 1;
        displayEmails();
        emailSearch.focus();
    });
}

/* ====== SORT HEADER CLICK (ADDED) ====== */
document.addEventListener('click', (e) => {
    const header = e.target.closest('.sortable');
    if (!header) return;

    const column = header.dataset.sort;

    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }

    document.querySelectorAll('.sortable')
        .forEach(h => h.classList.remove('asc', 'desc'));

    header.classList.add(sortDirection);

    displayEmails();
});

/* ☑ SELECT ALL CHECKBOX HANDLER (FIXED – ALL PAGES) */
if (selectAllEmails) {
    selectAllEmails.addEventListener('change', () => {

        if (selectAllEmails.checked) {
            // ✅ Select ALL emails (across all pages)
            emails.forEach(e => {
                selectedEmails.add(String(e.id));
            });
        } else {
            // ❌ Deselect ALL emails
            selectedEmails.clear();
        }

        // 🔄 Re-render current page to sync UI
        displayEmails();
    });
}


/* ☑ INDIVIDUAL CHECKBOX HANDLER (ADDED) */
document.addEventListener('change', (e) => {
    if (!e.target.classList.contains('email-checkbox')) return;

    const id = e.target.dataset.id;

    if (e.target.checked) {
        selectedEmails.add(id);
    } else {
        selectedEmails.delete(id);
    }

    updateSelectAllCheckbox(); // ✅ ADD THIS LINE
});

function updateSelectAllCheckbox() {
    if (!selectAllEmails) return;

    selectAllEmails.checked =
        selectedEmails.size > 0 &&
        selectedEmails.size === emails.length;
}


/* ====== Filter Buttons ====== */
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn')
            .forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        currentPage = 1;
        displayEmails();
    });
});

/* ====== Initialization ====== */
function initApp() {
    updateFileList();
    updateStats();
}

/* ====== File Handling ====== */
function handleFileSelect(e) {
    addFilesToQueue([...e.target.files]);
    fileInput.value = '';
}

function handleDragOver(e) {
    e.preventDefault();
    dropArea.classList.add('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    dropArea.classList.remove('dragover');
    addFilesToQueue([...e.dataTransfer.files]);
}

function addFilesToQueue(fileArray) {
    let added = false;

    fileArray.forEach(file => {
        if (isFileTypeSupported(file)) {
            if (!files.some(f => f.name === file.name && f.size === file.size)) {
                files.push(file);
                showNotification(`Added: ${file.name}`, 'success');
                added = true;
            } else {
                showNotification(`File already exists: ${file.name}`, 'warning');
            }
        } else {
            showNotification(`Unsupported file: ${file.name}`, 'error');
        }
    });

    if (added) {
        updateFileList();
        updateStats();
    }
}

function isFileTypeSupported(file) {
    return (
        file.type === 'application/pdf' ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.pdf') ||
        file.name.toLowerCase().endsWith('.docx')
    );
}

function updateFileList() {
    if (!files.length) {
        fileList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-alt"></i>
                <h3>No files selected</h3>
                <p>Upload PDF or DOCX files to extract emails</p>
            </div>`;
        return;
    }

    fileList.innerHTML = '';
    files.forEach((file, index) => {
        const isPDF = file.name.toLowerCase().endsWith('.pdf');
        const type = isPDF ? 'pdf' : 'docx';

        fileList.innerHTML += `
            <div class="file-item ${type}">
                <div class="file-info">
                    <i class="fas ${isPDF ? 'fa-file-pdf' : 'fa-file-word'} file-icon ${type}"></i>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            <span>${formatFileSize(file.size)}</span>
                            <span>${type.toUpperCase()}</span>
                        </div>
                    </div>
                </div>
                <button class="remove-file" onclick="removeFile(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>`;
    });
}

function removeFile(index) {
    const name = files[index].name;
    files.splice(index, 1);
    updateFileList();
    updateStats();
    showNotification(`Removed: ${name}`, 'info');
}

function updateStats() {
    document.getElementById('totalFiles').textContent = files.length;
    document.getElementById('supportedFiles').textContent = files.length;
    document.getElementById('totalSize').textContent =
        formatFileSize(files.reduce((s, f) => s + f.size, 0));
}

function formatFileSize(bytes) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/* ====== REAL EMAIL EXTRACTION ====== */

async function extractEmails() {
    if (!files.length) {
        showNotification('Please upload at least one file.', 'error');
        return;
    }

    emails = [];
    currentPage = 1;

    loadingIndicator.style.display = 'block';
    emailsList.style.display = 'none';
    resultsInfo.style.display = 'none';
    pagination.style.display = 'none';

    document.getElementById('loadingDetails').textContent =
        `Processing ${files.length} file(s)`;

    for (const file of files) {
        let text = '';

        if (file.name.toLowerCase().endsWith('.pdf')) {
            text = await extractTextFromPDF(file);
        } else if (file.name.toLowerCase().endsWith('.docx')) {
            text = await extractTextFromDOCX(file);
        }

        extractEmailsFromText(text, file.name);
    }

    const seen = new Set();
    emails = emails.filter(e => {
        if (seen.has(e.email)) return false;
        seen.add(e.email);
        return true;
    });

    loadingIndicator.style.display = 'none';
    emailsList.style.display = 'block';
    resultsInfo.style.display = 'flex';

    displayEmails();
    showNotification(`Extracted ${emails.length} emails`, 'success');
}

/* ====== PDF ====== */
async function extractTextFromPDF(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        content.items.forEach(item => text += item.str + ' ');
    }
    return text;
}

/* ====== DOCX ====== */
async function extractTextFromDOCX(file) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
}

/* ====== Email Parsing ====== */
function extractEmailsFromText(text, source) {
    const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
    const found = text.match(regex) || [];

    found.forEach(email => {
        emails.push({
            id: Date.now() + Math.random(),
            email,
            domain: email.split('@')[1] || '',   // ✅ ADDED
            valid: validateEmail(email),
            source,
            extractedAt: new Date().toISOString()
        });
    });
}

function validateEmail(email) {
    const lowerEmail = email.toLowerCase();

    // 🚫 Manually invalid emails
    if (MANUALLY_INVALID_EMAILS.has(lowerEmail)) {
        return false;
    }

    const strictRegex =
        /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

    if (!strictRegex.test(lowerEmail)) return false;
    if (lowerEmail.includes('..')) return false;
    if (lowerEmail.startsWith('.') || lowerEmail.endsWith('.')) return false;
    if (lowerEmail.includes('@.') || lowerEmail.includes('.@')) return false;

    return true;
}



/* ✨ Highlight helper (ADDED) */
function highlightMatch(text, query) {
    if (!query) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'ig');
    return text.replace(regex, '<mark>$1</mark>');
}

/* ====== Display Emails (FILTER + SEARCH + HIGHLIGHT + DOMAIN) ====== */
function displayEmails() {
    const filtered = emails.filter(e => {
        const matchesFilter =
            currentFilter === 'all' ||
            (currentFilter === 'valid' && e.valid) ||
            (currentFilter === 'invalid' && !e.valid);

        const matchesSearch =
            e.email.toLowerCase().includes(searchQuery) ||
            e.domain.toLowerCase().includes(searchQuery) ||   // ✅ ADDED
            e.source.toLowerCase().includes(searchQuery);

        return matchesFilter && matchesSearch;
    });
    /* 🔃 SORT LOGIC (ADDED) */
    if (sortColumn) {
        filtered.sort((a, b) => {
            let A = '', B = '';

            if (sortColumn === 'email') {
                A = a.email;
                B = b.email;
            } else if (sortColumn === 'status') {
                A = a.valid ? 'valid' : 'invalid';
                B = b.valid ? 'valid' : 'invalid';
            } else if (sortColumn === 'domain') {
                A = a.domain;
                B = b.domain;
            } else if (sortColumn === 'source') {
                A = a.source;
                B = b.source;
            }

            return sortDirection === 'asc'
                ? A.localeCompare(B)
                : B.localeCompare(A);
        });
    }

    // ✅ Keep current page within valid range
    currentPage = Math.min(
        currentPage,
        Math.ceil(filtered.length / emailsPerPage) || 1
    );
    const start = (currentPage - 1) * emailsPerPage;
    const pageEmails = filtered.slice(start, start + emailsPerPage);

    emailsList.innerHTML = '';

    if (!pageEmails.length) {
        emailsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No emails found</h3>
            </div>`;
    }

    pageEmails.forEach(e => {
        const checked = selectedEmails.has(String(e.id)) ? 'checked' : '';
        const emailHtml = highlightMatch(e.email, searchQuery);
        const domainHtml = highlightMatch(e.domain, searchQuery);
        const sourceHtml = highlightMatch(e.source, searchQuery);

        emailsList.innerHTML += `
        <div class="email-row">
            <!-- ☑ Checkbox Column (ADDED) -->
            <div class="email-column">
                <input 
                    type="checkbox"
                    class="email-checkbox"
                    data-id="${e.id}"
                    ${checked}
                >
            </div>

            <!-- Email -->
            <div class="email-column email-address">
                ${emailHtml}
            </div>

            <!-- Status -->
            <div class="email-column">
                <span class="status-badge ${e.valid ? 'status-valid' : 'status-invalid'}">
                    ${e.valid ? 'Valid' : 'Invalid'}
                </span>
            </div>

            <!-- Domain -->
            <div class="email-column email-domain">
                ${domainHtml}
            </div>

            <!-- Source -->
            <div class="email-column">
                ${sourceHtml}
            </div>

            <!-- Actions -->
            <div class="email-column">
                <button class="action-icon copy"
                    onclick="navigator.clipboard.writeText('${e.email}')">
                    <i class="fas fa-copy"></i>
                </button>
            </div>
        </div>`;
    });

    updatePagination(filtered.length);
    updateSummary();
}

function updateSummary() {
    document.getElementById('totalEmails').textContent = emails.length;
    document.getElementById('validCount').textContent = emails.filter(e => e.valid).length;
    document.getElementById('invalidCount').textContent = emails.filter(e => !e.valid).length;
    document.getElementById('uniqueEmails').textContent = emails.length;
}

/* ====== Pagination ====== */
function updatePagination(total) {
    const totalPages = Math.ceil(total / emailsPerPage);
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    pagination.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        displayEmails();
    }
}

function goToNextPage() {
    currentPage++;
    displayEmails();
}

/* ====== Export ====== */
function exportToCSV() {
    if (!emails.length) {
        showNotification('No emails to export.', 'error');
        return;
    }

    let csv = 'Email,Domain,Valid,Source,Date\n'; // ✅ ADDED Domain
    emails.forEach(e => {
        csv += `"${e.email}","${e.domain}",${e.valid},"${e.source}","${e.extractedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'extracted_emails.csv';
    link.click();
}
/* ====== Copy Selected Emails (ADDED) ====== */
function copySelectedEmails() {
    if (!selectedEmails.size) {
        showNotification('No emails selected to copy.', 'warning');
        return;
    }

    // Get selected email addresses
    const selectedList = emails
        .filter(e => selectedEmails.has(String(e.id)))
        .map(e => e.email);

    const textToCopy = selectedList.join('\n');

    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showNotification(
                `${selectedList.length} email(s) copied to clipboard`,
                'success'
            );
        })
        .catch(() => {
            showNotification('Failed to copy emails.', 'error');
        });
}


/* ====== Clear ====== */
function clearAllFiles() {
    if (!files.length && !emails.length) return;

    files = [];
    emails = [];
    currentPage = 1;

    updateFileList();
    updateStats();
    emailsList.innerHTML = '';
    resultsInfo.style.display = 'none';
    pagination.style.display = 'none';

    showNotification('All files and emails cleared', 'info');
}

/* ====== Demo Function (KEPT) ====== */
function generateSampleEmails() {
    // kept intentionally for demo/future use
}

/* ====== Notification System ====== */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}
