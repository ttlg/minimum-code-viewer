// State
let currentFolder = null;
let openTabs = [];
let activeTab = null;

// DOM Elements
const openFolderBtn = document.getElementById('openFolderBtn');
const welcomeOpenBtn = document.getElementById('welcomeOpenBtn');
const fileTree = document.getElementById('fileTree');
const projectName = document.getElementById('projectName');
const tabsContainer = document.getElementById('tabsContainer');
const codeContainer = document.getElementById('codeContainer');
const welcomeScreen = document.getElementById('welcomeScreen');
const codeView = document.getElementById('codeView');
const lineNumbers = document.getElementById('lineNumbers');
const codeContent = document.getElementById('codeContent');
const statusFileInfo = document.getElementById('statusFileInfo');
const statusLineInfo = document.getElementById('statusLineInfo');

// Event Listeners
openFolderBtn.addEventListener('click', () => window.api.openFolderDialog());
welcomeOpenBtn.addEventListener('click', () => window.api.openFolderDialog());

// Listen for folder opened event
window.api.onFolderOpened((data) => {
  currentFolder = data.path;
  const folderName = data.path.split('/').pop() || data.path.split('\\').pop();
  projectName.textContent = folderName.toUpperCase();
  renderFileTree(data.tree);

  // Unwatch all files and clear tabs when opening new folder
  openTabs.forEach(tab => window.api.unwatchFile(tab.path));
  openTabs = [];
  activeTab = null;
  renderTabs();
  showWelcome();
});

// Listen for file changes
window.api.onFileChanged((data) => {
  const tab = openTabs.find(t => t.path === data.path);
  if (tab) {
    tab.content = data.content;
    if (activeTab === tab) {
      showCode(tab.content, tab.name);
    }
  }
});

// Render file tree
function renderFileTree(items, container = fileTree, level = 0) {
  container.innerHTML = '';

  items.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = `tree-item ${item.type}`;
    itemEl.style.paddingLeft = `${12 + level * 16}px`;

    const icon = getFileIcon(item);
    itemEl.innerHTML = `
      <span class="tree-icon">${icon}</span>
      <span class="tree-name">${escapeHtml(item.name)}</span>
    `;

    if (item.type === 'directory') {
      const childContainer = document.createElement('div');
      childContainer.className = 'tree-children collapsed';

      itemEl.addEventListener('click', (e) => {
        e.stopPropagation();
        itemEl.classList.toggle('expanded');
        childContainer.classList.toggle('collapsed');
      });

      container.appendChild(itemEl);
      renderFileTree(item.children, childContainer, level + 1);
      container.appendChild(childContainer);
    } else {
      itemEl.addEventListener('click', () => openFile(item));
      container.appendChild(itemEl);
    }
  });
}

// Get icon for file/folder
function getFileIcon(item) {
  if (item.type === 'directory') {
    return `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a">
      <path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3z"/>
    </svg>`;
  }

  const ext = item.name.split('.').pop().toLowerCase();
  const iconColors = {
    js: '#f7df1e',
    ts: '#3178c6',
    jsx: '#61dafb',
    tsx: '#3178c6',
    json: '#f7df1e',
    html: '#e34c26',
    css: '#264de4',
    scss: '#cc6699',
    md: '#083fa1',
    py: '#3776ab',
    rb: '#cc342d',
    go: '#00add8',
    rs: '#dea584',
    java: '#b07219',
    c: '#555555',
    cpp: '#f34b7d',
    h: '#555555',
    vue: '#4fc08d',
    svelte: '#ff3e00',
    yml: '#cb171e',
    yaml: '#cb171e',
    xml: '#e34c26',
    sh: '#89e051',
    bash: '#89e051',
    sql: '#e38c00'
  };

  const color = iconColors[ext] || '#6d8086';

  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="${color}">
    <path d="M13.85 4.44l-3.28-3.3-.35-.14H2.5l-.5.5v13l.5.5h11l.5-.5V4.8l-.15-.36zm-.85 1.06H10V2h.29L13 4.71v.79zM3 14V2h6v4h4v8H3z"/>
  </svg>`;
}

// Open file
async function openFile(item) {
  // Check if already open
  const existingTab = openTabs.find(tab => tab.path === item.path);
  if (existingTab) {
    setActiveTab(existingTab);
    return;
  }

  const result = await window.api.readFile(item.path);

  if (result.success) {
    const tab = {
      name: item.name,
      path: item.path,
      content: result.content
    };
    openTabs.push(tab);
    setActiveTab(tab);
    renderTabs();

    // Start watching the file for changes
    window.api.watchFile(item.path);
  } else {
    console.error('Failed to read file:', result.error);
  }
}

// Set active tab
function setActiveTab(tab) {
  activeTab = tab;
  renderTabs();
  showCode(tab.content, tab.name);
  statusFileInfo.textContent = tab.path;
}

// Render tabs
function renderTabs() {
  tabsContainer.innerHTML = '';

  openTabs.forEach(tab => {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab === activeTab ? 'active' : ''}`;
    tabEl.innerHTML = `
      <span class="tab-name">${escapeHtml(tab.name)}</span>
      <span class="tab-close">&times;</span>
    `;

    tabEl.querySelector('.tab-name').addEventListener('click', () => setActiveTab(tab));
    tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab);
    });

    tabsContainer.appendChild(tabEl);
  });
}

// Close tab
function closeTab(tab) {
  const index = openTabs.indexOf(tab);
  openTabs.splice(index, 1);

  // Stop watching the file
  window.api.unwatchFile(tab.path);

  if (activeTab === tab) {
    if (openTabs.length > 0) {
      setActiveTab(openTabs[Math.min(index, openTabs.length - 1)]);
    } else {
      activeTab = null;
      showWelcome();
    }
  }

  renderTabs();
}

// Show welcome screen
function showWelcome() {
  welcomeScreen.style.display = 'flex';
  codeView.style.display = 'none';
  statusFileInfo.textContent = '';
  statusLineInfo.textContent = '';
}

// Show code
function showCode(content, filename) {
  welcomeScreen.style.display = 'none';
  codeView.style.display = 'flex';

  const lines = content.split('\n');

  // Render line numbers
  lineNumbers.innerHTML = lines.map((_, i) => `<div>${i + 1}</div>`).join('');

  // Render code with syntax highlighting
  codeContent.innerHTML = highlightSyntax(content, filename);

  // Update status
  statusLineInfo.textContent = `${lines.length} lines`;
}

// Simple syntax highlighting
function highlightSyntax(code, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  let escaped = escapeHtml(code);

  // Common patterns for highlighting
  const jsLikeLanguages = ['js', 'ts', 'jsx', 'tsx', 'json', 'vue', 'svelte'];
  const pyLikeLanguages = ['py', 'rb'];
  const cLikeLanguages = ['c', 'cpp', 'h', 'java', 'go', 'rs'];

  if (jsLikeLanguages.includes(ext) || cLikeLanguages.includes(ext)) {
    // Keywords
    const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'extends', 'import', 'export', 'from', 'default', 'async', 'await', 'try', 'catch', 'throw', 'new', 'this', 'super', 'static', 'public', 'private', 'protected', 'interface', 'type', 'enum', 'implements', 'package', 'struct', 'fn', 'pub', 'mod', 'use', 'impl', 'trait', 'where', 'mut', 'ref', 'match', 'case', 'switch', 'break', 'continue', 'void', 'int', 'float', 'double', 'char', 'bool', 'boolean', 'string', 'number', 'any', 'null', 'undefined', 'true', 'false', 'nil', 'None'];

    keywords.forEach(kw => {
      escaped = escaped.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="keyword">$1</span>');
    });

    // Strings
    escaped = escaped.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="string">$&</span>');

    // Comments
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');

    // Numbers
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
  } else if (pyLikeLanguages.includes(ext)) {
    const keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'import', 'from', 'as', 'try', 'except', 'raise', 'with', 'in', 'is', 'not', 'and', 'or', 'True', 'False', 'None', 'self', 'lambda', 'yield', 'global', 'nonlocal', 'pass', 'break', 'continue', 'end', 'do', 'then', 'unless', 'until', 'require', 'attr_accessor', 'attr_reader'];

    keywords.forEach(kw => {
      escaped = escaped.replace(new RegExp(`\\b(${kw})\\b`, 'g'), '<span class="keyword">$1</span>');
    });

    escaped = escaped.replace(/(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="string">$&</span>');
    escaped = escaped.replace(/(#.*$)/gm, '<span class="comment">$1</span>');
    escaped = escaped.replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$1</span>');
  } else if (ext === 'html' || ext === 'xml') {
    escaped = escaped.replace(/(&lt;\/?[\w-]+)/g, '<span class="keyword">$1</span>');
    escaped = escaped.replace(/(&gt;)/g, '<span class="keyword">$1</span>');
    escaped = escaped.replace(/(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="string">$&</span>');
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="comment">$1</span>');
  } else if (ext === 'css' || ext === 'scss') {
    escaped = escaped.replace(/([\w-]+)(?=\s*:)/g, '<span class="keyword">$1</span>');
    escaped = escaped.replace(/(["'])(?:(?!\1)[^\\]|\\.)*?\1/g, '<span class="string">$&</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="comment">$1</span>');
    escaped = escaped.replace(/(#[\da-fA-F]{3,8})\b/g, '<span class="number">$1</span>');
  } else if (ext === 'md') {
    escaped = escaped.replace(/^(#{1,6}\s.*$)/gm, '<span class="keyword">$1</span>');
    escaped = escaped.replace(/(\*\*.*?\*\*)/g, '<span class="keyword">$1</span>');
    escaped = escaped.replace(/(`[^`]+`)/g, '<span class="string">$1</span>');
  }

  return escaped;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sync scroll between line numbers and code
codeContent.addEventListener('scroll', () => {
  lineNumbers.scrollTop = codeContent.scrollTop;
});
