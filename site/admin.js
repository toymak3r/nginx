let currentFile = null;
let quill = null;
let currentEditorMode = 'wysiwyg';
let isDirty = false;

// Check authentication status on load
async function checkAuth() {
try {
const response = await fetch('/api/auth/status');
const data = await response.json();
if (data.authenticated) {
showAdminPanel();
loadFileList();
} else {
showLoginForm();
}
} catch (error) {
console.error('Auth check failed:', error);
showLoginForm();
}
}

// Login
document.getElementById('login').addEventListener('submit', async (e) => {
e.preventDefault();
const username = document.getElementById('username').value;
const password = document.getElementById('password').value;
const errorDiv = document.getElementById('loginError');

try {
const response = await fetch('/api/login', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ username, password })
});

const data = await response.json();
if (response.ok) {
showAdminPanel();
loadFileList();
} else {
errorDiv.textContent = data.error || 'Login failed';
}
} catch (error) {
errorDiv.textContent = 'Connection error';
}
});

// Logout
async function logout() {
try {
await fetch('/api/logout', { method: 'POST' });
showLoginForm();
document.getElementById('username').value = '';
document.getElementById('password').value = '';
} catch (error) {
console.error('Logout failed:', error);
}
}

// Show/Hide panels
function showLoginForm() {
document.getElementById('loginForm').style.display = 'block';
document.getElementById('adminPanel').classList.remove('active');
}

function showAdminPanel() {
document.getElementById('loginForm').style.display = 'none';
document.getElementById('adminPanel').classList.add('active');
}

let allFiles = [];
let filteredFiles = [];
let sortColumn = 'name';
let sortDirection = 'asc';
let selectedFiles = new Set();

// Get file type icon
function getFileType(filename) {
const ext = filename.split('.').pop().toLowerCase();
if (['html', 'htm'].includes(ext)) return 'html';
if (['css'].includes(ext)) return 'css';
if (['js', 'mjs'].includes(ext)) return 'js';
if (['json'].includes(ext)) return 'json';
if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return 'image';
if (['pdf'].includes(ext)) return 'pdf';
if (['txt', 'md', 'log'].includes(ext)) return 'text';
return 'other';
}

// Get file type name for display
function getFileTypeName(filename) {
const ext = filename.split('.').pop().toLowerCase();
if (['html', 'htm'].includes(ext)) return 'HTML';
if (['css'].includes(ext)) return 'CSS';
if (['js', 'mjs'].includes(ext)) return 'JavaScript';
if (['json'].includes(ext)) return 'JSON';
if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return 'Image';
if (['pdf'].includes(ext)) return 'PDF';
if (['txt', 'md', 'log'].includes(ext)) return 'Text';
return ext.toUpperCase() || 'File';
}

// Format date
function formatDate(dateString) {
const date = new Date(dateString);
const now = new Date();
const diff = now - date;
const days = Math.floor(diff / (1000 * 60 * 60 * 24));

if (days === 0) {
return 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
} else if (days === 1) {
return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
} else if (days < 7) {
return days + ' days ago';
} else {
return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}
}

// Sort files
function sortFiles(column) {
if (sortColumn === column) {
sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
} else {
sortColumn = column;
sortDirection = 'asc';
}

// Update sort indicators
document.querySelectorAll('.file-table th').forEach(th => {
th.classList.remove('sort-asc', 'sort-desc');
});

const th = document.getElementById('sort' + column.charAt(0).toUpperCase() + column.slice(1));
if (th) {
th.classList.add(sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
}

filteredFiles.sort((a, b) => {
let aVal, bVal;

if (column === 'name') {
aVal = a.name.toLowerCase();
bVal = b.name.toLowerCase();
} else if (column === 'path') {
aVal = (a.path || a.name).toLowerCase();
bVal = (b.path || b.name).toLowerCase();
} else if (column === 'type') {
aVal = getFileTypeName(a.name);
bVal = getFileTypeName(b.name);
} else if (column === 'size') {
aVal = a.size || 0;
bVal = b.size || 0;
} else if (column === 'date') {
aVal = new Date(a.modified || 0);
bVal = new Date(b.modified || 0);
}

if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
return 0;
});

renderFileTable();
}

// Filter files
function filterFiles() {
const searchTerm = document.getElementById('fileSearch').value.toLowerCase();
filteredFiles = allFiles.filter(file => 
file.name.toLowerCase().includes(searchTerm) ||
(file.path && file.path.toLowerCase().includes(searchTerm))
);
// Clear selection when filtering (optional - you can remove this if you want to keep selection)
// selectedFiles.clear();
renderFileTable();
}

// Render file table
function renderFileTable() {
const tbody = document.getElementById('fileTableBody');
tbody.innerHTML = '';

if (filteredFiles.length === 0) {
tbody.innerHTML = '<tr><td colspan="7" class="file-empty">No files found</td></tr>';
updateFileStats();
updateBulkActions();
return;
}

filteredFiles.forEach(file => {
if (file.type === 'file') {
const tr = document.createElement('tr');
const isDirectory = file.type === 'directory';
const fileType = isDirectory ? 'directory' : getFileType(file.name);
const fileTypeName = isDirectory ? 'Directory' : getFileTypeName(file.name);
const isSelected = selectedFiles.has(file.path || file.name);
const escapedName = file.name.replace(/'/g, "\\'");

if (isSelected) {
tr.classList.add('selected');
}

const filePath = file.path || file.name;
const displayPath = filePath === file.name ? '/' : '/' + filePath.replace(/\\/g, '/');
const escapedPath = filePath.replace(/'/g, "\\'");

tr.innerHTML = `
<td>
<input type="checkbox" class="file-checkbox" data-filename="${escapedPath}" 
${isSelected ? 'checked' : ''} 
onchange="toggleFileSelection('${escapedPath}', this.checked)"
onclick="event.stopPropagation()">
</td>
<td>
<div class="file-icon" data-type="${fileType}">
<span class="file-name">${isDirectory ? '📁 ' : ''}${file.name}</span>
</div>
</td>
<td class="file-path" title="${displayPath}">${displayPath}</td>
<td class="file-type">${fileTypeName}</td>
<td class="file-size">${isDirectory ? '-' : formatSize(file.size || 0)}</td>
<td class="file-date">${formatDate(file.modified || new Date())}</td>
<td class="file-actions">
${isDirectory ? '' : `<button onclick="event.stopPropagation(); editFile('${escapedPath}')" title="Edit">✏️ Edit</button>`}
<button onclick="event.stopPropagation(); showRenameDialog('${escapedPath}')" title="Rename">✏️ Rename</button>
<button onclick="event.stopPropagation(); showMoveDialog('${escapedPath}')" title="Move">📦 Move</button>
<button class="delete" onclick="event.stopPropagation(); deleteFile('${escapedPath}')" title="Delete">🗑️ Delete</button>
</td>
`;

// Add click handler for row selection
tr.addEventListener('click', (e) => {
if (e.target.type !== 'checkbox' && e.target.tagName !== 'BUTTON') {
toggleFileSelection(filePath, !isSelected);
}
});

tbody.appendChild(tr);
}
});

updateFileStats();
updateBulkActions();
updateSelectAllCheckbox();
}

// Update file statistics
function updateFileStats() {
const count = filteredFiles.filter(f => f.type === 'file').length;
const totalSize = filteredFiles.reduce((sum, file) => sum + (file.size || 0), 0);

document.getElementById('fileCount').textContent = `${count} file${count !== 1 ? 's' : ''}`;
document.getElementById('totalSize').textContent = formatSize(totalSize);
}

// Load file list
async function loadFileList() {
try {
const response = await fetch('/api/files');
allFiles = await response.json();
filteredFiles = [...allFiles];
sortFiles(sortColumn);
} catch (error) {
console.error('Failed to load files:', error);
document.getElementById('fileTableBody').innerHTML = 
'<tr><td colspan="7" class="file-empty">Error loading files</td></tr>';
}
}

// Refresh file list
function refreshFileList() {
selectedFiles.clear();
loadFileList();
}

// Toggle file selection
function toggleFileSelection(filename, checked) {
if (checked) {
selectedFiles.add(filename);
} else {
selectedFiles.delete(filename);
}
updateBulkActions();
updateSelectAllCheckbox();
renderFileTable();
}

// Toggle select all
function toggleSelectAll(checked) {
filteredFiles.forEach(file => {
if (file.type === 'file') {
const filePath = file.path || file.name;
if (checked) {
selectedFiles.add(filePath);
} else {
selectedFiles.delete(filePath);
}
}
});
updateBulkActions();
renderFileTable();
}

// Update select all checkbox state
function updateSelectAllCheckbox() {
const checkbox = document.getElementById('selectAllCheckbox');
if (!checkbox) return;

const fileCount = filteredFiles.filter(f => f.type === 'file').length;
const selectedCount = filteredFiles.filter(f => {
if (f.type !== 'file') return false;
const filePath = f.path || f.name;
return selectedFiles.has(filePath);
}).length;

checkbox.checked = fileCount > 0 && selectedCount === fileCount;
checkbox.indeterminate = selectedCount > 0 && selectedCount < fileCount;
}

// Select all files
function selectAllFiles() {
filteredFiles.forEach(file => {
if (file.type === 'file') {
const filePath = file.path || file.name;
selectedFiles.add(filePath);
}
});
updateBulkActions();
renderFileTable();
}

// Deselect all files
function deselectAllFiles() {
filteredFiles.forEach(file => {
const filePath = file.path || file.name;
selectedFiles.delete(filePath);
});
updateBulkActions();
renderFileTable();
}

// Update bulk actions visibility
function updateBulkActions() {
const bulkActions = document.getElementById('bulkActions');
const bulkActionsInfo = document.getElementById('bulkActionsInfo');
const selectedCount = Array.from(selectedFiles).length;

if (selectedCount > 0) {
bulkActions.classList.add('active');
bulkActionsInfo.textContent = `${selectedCount} file${selectedCount !== 1 ? 's' : ''} selected`;
} else {
bulkActions.classList.remove('active');
}
}

// Delete selected files
async function deleteSelectedFiles() {
const filesToDelete = Array.from(selectedFiles);
if (filesToDelete.length === 0) return;

const fileList = filesToDelete.join(', ');
if (!confirm(`Are you sure you want to delete ${filesToDelete.length} file(s)?\n\n${fileList}`)) {
return;
}

const progressDiv = document.getElementById('uploadProgress');
const statusDiv = document.getElementById('uploadStatus');
progressDiv.style.display = 'block';
statusDiv.innerHTML = `Deleting ${filesToDelete.length} file(s)...`;

let successCount = 0;
let failCount = 0;

for (const filename of filesToDelete) {
try {
const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
method: 'DELETE'
});

if (response.ok) {
successCount++;
selectedFiles.delete(filename);
} else {
failCount++;
}
} catch (error) {
console.error(`Failed to delete ${filename}:`, error);
failCount++;
}
}

progressDiv.style.display = 'none';
updateBulkActions();
loadFileList();

if (failCount === 0) {
alert(`Successfully deleted ${successCount} file(s)`);
} else {
alert(`Deleted ${successCount} file(s), ${failCount} failed`);
}
}

// Initialize WYSIWYG editor
function initWysiwygEditor() {
if (quill) {
quill.destroy();
}

const editorDiv = document.getElementById('wysiwygEditor');
editorDiv.innerHTML = '';

quill = new Quill('#wysiwygEditor', {
theme: 'snow',
modules: {
toolbar: [
[{ 'header': [1, 2, 3, 4, 5, 6, false] }],
['bold', 'italic', 'underline', 'strike'],
[{ 'color': [] }, { 'background': [] }],
[{ 'list': 'ordered'}, { 'list': 'bullet' }],
[{ 'align': [] }],
['link', 'image', 'blockquote', 'code-block'],
['clean']
]
},
placeholder: 'Start editing...'
});

quill.on('text-change', function() {
isDirty = true;
updateSaveIndicator('dirty');
});
}

// Switch between WYSIWYG and code mode
function switchEditorMode(mode) {
currentEditorMode = mode;
const wysiwygBtn = document.getElementById('wysiwygModeBtn');
const codeBtn = document.getElementById('codeModeBtn');
const wysiwygEditor = document.getElementById('wysiwygEditor');
const codeEditor = document.getElementById('fileEditor');

if (mode === 'wysiwyg') {
wysiwygBtn.classList.add('active');
codeBtn.classList.remove('active');
wysiwygEditor.style.display = 'block';
codeEditor.style.display = 'none';

if (quill && codeEditor.value) {
quill.root.innerHTML = codeEditor.value;
}
} else {
wysiwygBtn.classList.remove('active');
codeBtn.classList.add('active');
wysiwygEditor.style.display = 'none';
codeEditor.style.display = 'block';

if (quill) {
codeEditor.value = quill.root.innerHTML;
}
}
}

// Update save indicator
function updateSaveIndicator(status) {
const indicator = document.getElementById('saveIndicator');
indicator.className = 'save-indicator';

switch(status) {
case 'saving':
indicator.textContent = '⏳ Saving...';
indicator.classList.add('saving');
break;
case 'saved':
indicator.textContent = '✓ Saved';
indicator.classList.add('saved');
setTimeout(() => {
if (indicator.classList.contains('saved')) {
indicator.textContent = '';
indicator.className = 'save-indicator';
}
}, 2000);
break;
case 'error':
indicator.textContent = '✗ Error';
indicator.classList.add('error');
break;
case 'dirty':
indicator.textContent = '● Unsaved changes';
break;
default:
indicator.textContent = '';
}
}

// Edit file
async function editFile(filename) {
try {
const response = await fetch(`/api/files/${encodeURIComponent(filename)}`);
const data = await response.json();
currentFile = filename;
isDirty = false;

document.getElementById('editorTitle').textContent = `Editing: ${filename}`;
document.getElementById('fileEditor').value = data.content;
document.getElementById('editorContainer').style.display = 'block';
document.getElementById('saveMessage').textContent = '';
document.getElementById('saveMessage').className = '';
updateSaveIndicator('');

if (!quill) {
initWysiwygEditor();
}

const isHtml = filename.toLowerCase().endsWith('.html') || filename.toLowerCase().endsWith('.htm');
if (isHtml) {
switchEditorMode('wysiwyg');
quill.root.innerHTML = data.content;
} else {
switchEditorMode('code');
}

document.getElementById('editorContainer').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
} catch (error) {
alert('Failed to load file');
}
}

// Save file
async function saveFile() {
if (!currentFile) return;

updateSaveIndicator('saving');

try {
let content;
if (currentEditorMode === 'wysiwyg' && quill) {
content = quill.root.innerHTML;
} else {
content = document.getElementById('fileEditor').value;
}

const response = await fetch(`/api/files/${encodeURIComponent(currentFile)}`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ content })
});

const data = await response.json();
const messageDiv = document.getElementById('saveMessage');

if (response.ok) {
isDirty = false;
updateSaveIndicator('saved');
messageDiv.textContent = 'File saved successfully!';
messageDiv.className = 'save-message success';
setTimeout(() => {
messageDiv.textContent = '';
messageDiv.className = 'save-message';
}, 3000);
} else {
updateSaveIndicator('error');
messageDiv.textContent = data.error || 'Failed to save file';
messageDiv.className = 'save-message error';
}
} catch (error) {
updateSaveIndicator('error');
const messageDiv = document.getElementById('saveMessage');
messageDiv.textContent = 'Connection error';
messageDiv.className = 'save-message error';
}
}

// Cancel edit
function cancelEdit() {
if (isDirty && !confirm('You have unsaved changes. Are you sure you want to cancel?')) {
return;
}
document.getElementById('editorContainer').style.display = 'none';
currentFile = null;
isDirty = false;
document.getElementById('fileEditor').value = '';
updateSaveIndicator('');
if (quill) {
quill.setText('');
}
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
if ((e.ctrlKey || e.metaKey) && e.key === 's') {
e.preventDefault();
if (currentFile) {
saveFile();
}
}
if (e.key === 'Escape' && currentFile) {
cancelEdit();
}
});

// Create directory
async function createDirectory(dirPath) {
try {
console.log('Sending create directory request:', dirPath);
const response = await fetch('/api/directory', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ path: dirPath })
});

const data = await response.json();
console.log('Create directory response:', response.status, data);

if (response.ok) {
return { success: true, message: data.message };
} else {
return { success: false, message: data.error || 'Failed to create directory' };
}
} catch (error) {
console.error('Create directory error:', error);
return { success: false, message: 'Connection error: ' + error.message };
}
}

// Show create directory dialog
function showCreateDirectoryDialog() {
const dirName = prompt('Enter directory name or path (e.g., "subdir" or "parent/child"):');
if (!dirName || !dirName.trim()) return;

const dirPath = dirName.trim();
console.log('Creating directory:', dirPath);
createDirectory(dirPath).then(result => {
if (result.success) {
alert('Directory created successfully!');
loadFileList(); // Refresh file list
} else {
alert('Error: ' + result.message);
console.error('Directory creation failed:', result.message);
}
});
}

// Rename file or directory
async function renameFile(oldPath, newName) {
try {
const response = await fetch(`/api/files/${encodeURIComponent(oldPath)}`, {
method: 'PUT',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ newName: newName.trim() })
});

const data = await response.json();
if (response.ok) {
loadFileList();
return { success: true, message: data.message };
} else {
return { success: false, message: data.error || 'Failed to rename' };
}
} catch (error) {
return { success: false, message: 'Connection error' };
}
}

// Show rename dialog
function showRenameDialog(filePath) {
const fileName = filePath.split('/').pop();
const newName = prompt(`Rename "${fileName}" to:`, fileName);
if (!newName || newName.trim() === fileName || !newName.trim()) return;

renameFile(filePath, newName.trim()).then(result => {
if (result.success) {
// Success message handled by loadFileList refresh
} else {
alert('Error: ' + result.message);
}
});
}

// Move file or directory
async function moveFile(sourcePath, destination) {
try {
const response = await fetch(`/api/files/${encodeURIComponent(sourcePath)}/move`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ destination: destination.trim() })
});

const data = await response.json();
if (response.ok) {
loadFileList();
return { success: true, message: data.message };
} else {
return { success: false, message: data.error || 'Failed to move' };
}
} catch (error) {
return { success: false, message: 'Connection error' };
}
}

// Show move dialog
function showMoveDialog(filePath) {
const fileName = filePath.split('/').pop();
const currentDir = filePath.includes('/') ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
const destination = prompt(`Move "${fileName}" to directory (relative to /www):\n\nCurrent location: ${currentDir || '/'}\n\nEnter destination path:`, currentDir);
if (destination === null) return; // User cancelled

moveFile(filePath, destination || '').then(result => {
if (result.success) {
// Success message handled by loadFileList refresh
} else {
alert('Error: ' + result.message);
}
});
}

// Delete file
async function deleteFile(filename) {
if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

try {
const response = await fetch(`/api/files/${encodeURIComponent(filename)}`, {
method: 'DELETE'
});

if (response.ok) {
loadFileList();
} else {
const data = await response.json();
alert('Failed to delete: ' + (data.error || 'Unknown error'));
}
} catch (error) {
alert('Connection error');
}
}

let uploadMode = 'files';

// Switch between file and directory upload modes
function switchUploadMode(mode) {
uploadMode = mode;
const fileInput = document.getElementById('fileInput');
const fileModeBtn = document.getElementById('fileModeBtn');
const directoryModeBtn = document.getElementById('directoryModeBtn');
const uploadInfo = document.getElementById('uploadInfo');
const directoryPreview = document.getElementById('directoryPreview');

// Reset file input
fileInput.value = '';
directoryPreview.style.display = 'none';
directoryPreview.innerHTML = '';
uploadInfo.textContent = '';

if (mode === 'directory') {
fileModeBtn.classList.remove('active');
directoryModeBtn.classList.add('active');
fileInput.removeAttribute('multiple');
fileInput.setAttribute('webkitdirectory', '');
fileInput.setAttribute('directory', '');
document.getElementById('targetDirectoryContainer').style.display = 'block';
uploadInfo.innerHTML = '<strong>Directory Mode:</strong> Select a folder to upload all files and subdirectories. Directory structure will be preserved.';
} else {
fileModeBtn.classList.add('active');
directoryModeBtn.classList.remove('active');
fileInput.removeAttribute('webkitdirectory');
fileInput.removeAttribute('directory');
fileInput.setAttribute('multiple', '');
document.getElementById('targetDirectoryContainer').style.display = 'none';
document.getElementById('targetDirectory').value = '';
uploadInfo.innerHTML = '<strong>File Mode:</strong> Select one or multiple files to upload.';
}
}

// Preview directory structure before upload
function previewDirectory(files) {
const directoryPreview = document.getElementById('directoryPreview');
if (!files || files.length === 0) {
directoryPreview.style.display = 'none';
return;
}

directoryPreview.style.display = 'block';
const fileMap = new Map();
const directories = new Set();

// Organize files by directory
Array.from(files).forEach(file => {
const webkitRelativePath = file.webkitRelativePath || file.name;
const pathParts = webkitRelativePath.split('/');
const dir = pathParts.slice(0, -1).join('/');

if (dir) {
directories.add(dir);
if (!fileMap.has(dir)) {
fileMap.set(dir, []);
}
fileMap.get(dir).push(pathParts[pathParts.length - 1]);
} else {
if (!fileMap.has('')) {
fileMap.set('', []);
}
fileMap.get('').push(file.name);
}
});

let html = '<strong>Directory Structure Preview:</strong><br><br>';
const sortedDirs = Array.from(directories).sort();

// Show root files first
if (fileMap.has('') && fileMap.get('').length > 0) {
fileMap.get('').forEach(file => {
html += `<div class="file-item">📄 ${file}</div>`;
});
}

// Show directories and their files
sortedDirs.forEach(dir => {
html += `<div class="file-item directory">📁 ${dir}/</div>`;
fileMap.get(dir).forEach(file => {
html += `<div class="file-item" style="padding-left: 1.5rem;">📄 ${file}</div>`;
});
});

directoryPreview.innerHTML = html;
}

// Handle file input change
document.getElementById('fileInput').addEventListener('change', function(e) {
const files = e.target.files;
if (uploadMode === 'directory' && files.length > 0) {
previewDirectory(files);

// Try to auto-detect and suggest target directory name
const allPaths = Array.from(files)
.map(f => f.webkitRelativePath || f.name)
.filter(p => p);

if (allPaths.length > 0) {
// Check if all paths share a common root directory
const firstPathParts = allPaths[0].split('/');
if (firstPathParts.length > 1) {
const candidateRoot = firstPathParts[0];
const allShareRoot = allPaths.every(p => {
const parts = p.split('/');
return parts.length === 1 || parts[0] === candidateRoot;
});

if (allShareRoot) {
// Auto-fill target directory if empty
const targetDirInput = document.getElementById('targetDirectory');
if (!targetDirInput.value.trim()) {
targetDirInput.value = candidateRoot;
targetDirInput.placeholder = `Auto-detected: ${candidateRoot}`;
}
}
}
}
} else {
document.getElementById('directoryPreview').style.display = 'none';
}
});

// Initialize upload mode
switchUploadMode('files');

// Upload file(s) or directory
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
e.preventDefault();
const fileInput = document.getElementById('fileInput');
const files = fileInput.files;
const messageDiv = document.getElementById('uploadMessage');
const progressDiv = document.getElementById('uploadProgress');
const statusDiv = document.getElementById('uploadStatus');

if (!files || files.length === 0) {
messageDiv.textContent = uploadMode === 'directory' 
? 'Please select a directory' 
: 'Please select at least one file';
messageDiv.className = 'upload-message error';
return;
}

const formData = new FormData();

// For directory uploads, get target directory name from input or detect from paths
let targetDirectoryName = null;
if (uploadMode === 'directory' && files.length > 0) {
// First, check if user specified a target directory name
const targetDirInput = document.getElementById('targetDirectory');
const userSpecifiedDir = targetDirInput.value.trim();

if (userSpecifiedDir) {
// User specified a directory name - use it
targetDirectoryName = userSpecifiedDir.replace(/[\/\\]/g, ''); // Remove any slashes for safety
} else {
// Try to auto-detect from file paths
const allPaths = Array.from(files)
.map(f => f.webkitRelativePath || f.name)
.filter(p => p);

if (allPaths.length > 0) {
// Check if all paths share a common root directory
const firstPathParts = allPaths[0].split('/');

if (firstPathParts.length > 1) {
// First path has directory structure - check if all paths share the same root
const candidateRoot = firstPathParts[0];
const allShareRoot = allPaths.every(p => {
const parts = p.split('/');
return parts.length === 1 || parts[0] === candidateRoot;
});

if (allShareRoot) {
targetDirectoryName = candidateRoot;
}
}
}
}
}

// Append all selected files with their relative paths for directory uploads
for (let i = 0; i < files.length; i++) {
const file = files[i];
// For directory uploads, preserve the directory structure
if (uploadMode === 'directory' && file.webkitRelativePath) {
let uploadPath = file.webkitRelativePath;
const pathParts = uploadPath.split('/');

// If user specified a target directory or we detected one, and file is in root of selected directory
if (targetDirectoryName && pathParts.length === 1) {
// File is in root of selected directory - prepend target directory name
uploadPath = targetDirectoryName + '/' + uploadPath;
} else if (targetDirectoryName && pathParts.length > 1 && pathParts[0] !== targetDirectoryName) {
// Path has directory structure but doesn't start with target directory - prepend it
uploadPath = targetDirectoryName + '/' + uploadPath;
}
// If path already starts with target directory or no target directory specified, use as-is

formData.append('files', file, uploadPath);
} else {
formData.append('files', file);
}
}

// Show progress
progressDiv.style.display = 'block';
const uploadType = uploadMode === 'directory' ? 'directory' : 'file(s)';
statusDiv.innerHTML = `Uploading ${files.length} ${uploadType}...`;
messageDiv.textContent = '';
messageDiv.className = '';

try {
const response = await fetch('/api/upload', {
method: 'POST',
body: formData
});

const data = await response.json();
if (response.ok) {
if (data.count === 1) {
messageDiv.textContent = `File "${data.files[0].filename}" uploaded successfully!`;
progressDiv.style.display = 'none';
} else {
const uploadTypeText = uploadMode === 'directory' ? 'files from directory' : 'files';
messageDiv.textContent = `${data.count} ${uploadTypeText} uploaded successfully!`;
const fileList = data.files.map(f => `• ${f.filename}`).join('<br>');
statusDiv.innerHTML = `<strong>Uploaded files:</strong><br>${fileList}`;
}
messageDiv.className = 'upload-message success';
fileInput.value = '';
document.getElementById('directoryPreview').style.display = 'none';
loadFileList();
} else {
progressDiv.style.display = 'none';
messageDiv.textContent = data.error || 'Upload failed';
messageDiv.className = 'upload-message error';
}
} catch (error) {
progressDiv.style.display = 'none';
messageDiv.textContent = 'Connection error';
messageDiv.className = 'upload-message error';
}
});

// Switch tabs
function switchTab(tab) {
document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

if (tab === 'edit') {
document.querySelectorAll('.tab')[0].classList.add('active');
document.getElementById('editTab').classList.add('active');
} else {
document.querySelectorAll('.tab')[1].classList.add('active');
document.getElementById('uploadTab').classList.add('active');
}
}

// Format file size
function formatSize(bytes) {
if (bytes === 0) return '0 Bytes';
const k = 1024;
const sizes = ['Bytes', 'KB', 'MB', 'GB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Initialize WYSIWYG editor on page load
document.addEventListener('DOMContentLoaded', function() {
initWysiwygEditor();
});

// Initialize
checkAuth();
