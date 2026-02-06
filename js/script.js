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


/* ====== Application State ====== */
let files = [];
let emails = [];
let currentFilter = 'all';
let currentPage = 1;
const emailsPerPage = 10;

/* ====== Event Listeners ====== */
document.addEventListener('DOMContentLoaded', initApp);

browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();   // 🔥 stops bubbling to dropArea
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

/* ======================================================
   ✅ REAL EMAIL EXTRACTION (ONLY PART THAT CHANGED)
   ====================================================== */

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

    // Remove duplicates
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

/* ====== PDF Extraction ====== */
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

/* ====== DOCX Extraction ====== */
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
            valid: validateEmail(email),
            source,
            extractedAt: new Date().toISOString()
        });
    });
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ====== Display Emails ====== */
function displayEmails() {
    const filtered = emails.filter(e =>
        currentFilter === 'all' ||
        (currentFilter === 'valid' && e.valid) ||
        (currentFilter === 'invalid' && !e.valid)
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
        emailsList.innerHTML += `
            <div class="email-row">
                <div class="email-column email-address">${e.email}</div>
                <div class="email-column">
                    <span class="status-badge ${e.valid ? 'status-valid' : 'status-invalid'}">
                        ${e.valid ? 'Valid' : 'Invalid'}
                    </span>
                </div>
                <div class="email-column">${e.source}</div>
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

    let csv = 'Email,Valid,Source,Date\n';
    emails.forEach(e => {
        csv += `"${e.email}",${e.valid},"${e.source}","${e.extractedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'extracted_emails.csv';
    link.click();
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

/* ====== Notification System (UNCHANGED) ====== */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}
