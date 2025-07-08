
let currentTab = 'home';
let editors = {};
let activeEditor = null;
let tabCounter = 1;
let startTime = Date.now();
let scriptsExecuted = 0;
let robloxStatus = 'Not Injected';

class Toast {
  static show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, duration);
  }
}

function updateStats() {
  const uptime = Date.now() - startTime;
  const hours = Math.floor(uptime / (1000 * 60 * 60));
  const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
  
  const uptimeElement = document.getElementById('uptime');
  if (uptimeElement) {
    uptimeElement.textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  const scriptsElement = document.getElementById('scripts-executed');
  if (scriptsElement) {
    scriptsElement.textContent = scriptsExecuted;
  }
  
  const statusElement = document.getElementById('roblox-status');
  if (statusElement) {
    statusElement.textContent = robloxStatus;
  }
}

class CustomMonacoEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      value: '',
      language: 'lua',
      theme: 'pure-dark',
      fontSize: 16,
      fontFamily: 'Poppins, monospace',
      lineNumbers: true,
      wordWrap: true,
      minimap: false,
      ...options
    };
    
    this.value = this.options.value;
    this.cursorPosition = { line: 1, column: 1 };
    this.selection = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
    this.scrollTop = 0;
    this.scrollLeft = 0;
    
    this.createEditor();
    this.setupEventListeners();
  }
  
  createEditor() {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'custom-monaco-editor';
    this.wrapper.style.cssText = `
      width: 100%;
      height: 100%;
      background: #181A20;
      color: #F3F6FA;
      font-family: ${this.options.fontFamily};
      font-size: ${this.options.fontSize}px;
      line-height: 1.5;
      overflow: auto;
      position: relative;
      outline: none;
      border: none;
      resize: none;
    `;
    
    if (this.options.lineNumbers) {
      this.lineNumbersContainer = document.createElement('div');
      this.lineNumbersContainer.className = 'line-numbers';
      this.lineNumbersContainer.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: 50px;
        height: 100%;
        background: #181A20;
        border-right: 1px solid #3A3F5A;
        color: #6B7A99;
        font-size: ${this.options.fontSize}px;
        font-family: ${this.options.fontFamily};
        text-align: right;
        padding: 10px 5px;
        box-sizing: border-box;
        user-select: none;
        z-index: 1;
      `;
      this.wrapper.appendChild(this.lineNumbersContainer);
    }
    
    this.textarea = document.createElement('textarea');
    this.textarea.style.cssText = `
      width: 100%;
      height: 100%;
      background: transparent;
      color: #F3F6FA;
      font-family: ${this.options.fontFamily};
      font-size: ${this.options.fontSize}px;
      line-height: 1.5;
      border: none;
      outline: none;
      resize: none;
      padding: 10px ${this.options.lineNumbers ? '60px' : '10px'} 10px 10px;
      box-sizing: border-box;
      white-space: pre;
      overflow-wrap: ${this.options.wordWrap ? 'break-word' : 'normal'};
    `;
    this.textarea.value = this.value;
    this.wrapper.appendChild(this.textarea);
    
    this.container.appendChild(this.wrapper);
    
    this.updateLineNumbers();
  }
  
  setupEventListeners() {
    this.textarea.addEventListener('input', (e) => {
      this.value = e.target.value;
      this.updateLineNumbers();
      this.triggerChangeEvent();
    });

    this.textarea.addEventListener('scroll', (e) => {
      this.scrollTop = e.target.scrollTop;
      this.scrollLeft = e.target.scrollLeft;
      if (this.lineNumbersContainer) {
        this.lineNumbersContainer.scrollTop = e.target.scrollTop;
      }
    });
    
    this.textarea.addEventListener('focus', () => {
      this.wrapper.style.border = '1px solid #7B8CFF';
    });
    
    this.textarea.addEventListener('blur', () => {
      this.wrapper.style.border = 'none';
    });
    
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = this.textarea.selectionStart;
        const end = this.textarea.selectionEnd;
        this.textarea.value = this.textarea.value.substring(0, start) + '    ' + this.textarea.value.substring(end);
        this.textarea.selectionStart = this.textarea.selectionEnd = start + 4;
        this.value = this.textarea.value;
        this.triggerChangeEvent();
      }
      
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveCurrentFile();
      }
      
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        document.execCommand('undo');
      }
      
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        document.execCommand('redo');
      }
    });
  }
  
  updateLineNumbers() {
    if (!this.lineNumbersContainer) return;
    
    const lines = this.value.split('\n');
    this.lineNumbersContainer.innerHTML = lines.map((_, index) => 
      `<div style="height: 1.5em; line-height: 1.5em;">${index + 1}</div>`
    ).join('');
  }
  
  triggerChangeEvent() {
    if (this.onChangeCallback) {
      this.onChangeCallback();
    }
  }
  
  getValue() {
    return this.value;
  }
  
  setValue(value) {
    this.value = value;
    this.textarea.value = value;
    this.updateLineNumbers();
  }
  
  updateOptions(options) {
    this.options = { ...this.options, ...options };
    
    if (options.fontSize) {
      this.textarea.style.fontSize = `${options.fontSize}px`;
      if (this.lineNumbersContainer) {
        this.lineNumbersContainer.style.fontSize = `${options.fontSize}px`;
      }
    }
    
    if (options.lineNumbers !== undefined) {
      if (options.lineNumbers && !this.lineNumbersContainer) {
        this.createLineNumbers();
      } else if (!options.lineNumbers && this.lineNumbersContainer) {
        this.lineNumbersContainer.remove();
        this.lineNumbersContainer = null;
        this.textarea.style.paddingLeft = '10px';
      }
    }
    
    if (options.wordWrap !== undefined) {
      this.textarea.style.overflowWrap = options.wordWrap ? 'break-word' : 'normal';
    }
  }
  
  layout() {
    window.dispatchEvent(new Event('resize'));
  }
  
  dispose() {
    if (this.wrapper && this.wrapper.parentNode) {
      this.wrapper.parentNode.removeChild(this.wrapper);
    }
  }
  
  getDomNode() {
    return this.wrapper;
  }
  
  onDidChangeModelContent(callback) {
    this.onChangeCallback = callback;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
        initCustomMonaco();
    
    setInterval(updateStats, 1000);
    
    Toast.show('Welcome to Pure! Ready to execute scripts.', 'success', 4000);
    
    switchTab('home');
  }, 2000);
  
  initNavigation();
  
  initWindowControls();
  
  initEditorActions();
  
  initSettings();
  
  initScriptHub();
});

function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${tab}-tab`).classList.add('active');
  
  currentTab = tab;
  
  if (tab === 'editor' && activeEditor) {
    setTimeout(() => {
      if (activeEditor.layout) {
        activeEditor.layout();
      }
    }, 100);
  }
}

function initWindowControls() {
  const minimizeBtn = document.getElementById('minimize-btn');
  const maximizeBtn = document.getElementById('maximize-btn');
  const closeBtn = document.getElementById('close-btn');
  
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.minimizeWindow();
      } else {
        console.log('Minimize window');
      }
    });
  }
  
  if (maximizeBtn) {
    maximizeBtn.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.maximizeWindow();
      } else {
        console.log('Maximize window');
      }
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (window.electronAPI) {
        window.electronAPI.closeWindow();
      } else {
        console.log('Close window');
      }
    });
  }
}

function initCustomMonaco() {
  try {
    createNewTab();
    
    Toast.show('Custom Monaco Editor loaded successfully!', 'success');
  } catch (error) {
    console.error('Failed to load Custom Monaco Editor:', error);
    Toast.show('Failed to load editor', 'error');
  }
}

function createNewTab(content = '') {
  const tabId = `tab-${tabCounter++}`;
  const tabName = `Script ${tabCounter - 1}`;
  
  const tabButton = document.createElement('button');
  tabButton.className = 'tab';
  tabButton.setAttribute('data-tab', tabId);
  tabButton.innerHTML = `
    ${tabName}
    <button class="close-btn" onclick="closeTab('${tabId}')">×</button>
  `;
  
  const editorContainer = document.createElement('div');
  editorContainer.id = `editor-${tabId}`;
  editorContainer.style.height = '100%';
  editorContainer.style.display = 'none';
  
  const tabsContainer = document.getElementById('editor-tabs');
  const editorContainerParent = document.getElementById('editor-container');
  
  if (tabsContainer) tabsContainer.appendChild(tabButton);
  if (editorContainerParent) editorContainerParent.appendChild(editorContainer);
  
  const editor = new CustomMonacoEditor(editorContainer, {
    value: content,
    language: 'lua',
    theme: 'pure-dark',
    fontSize: 16,
    fontFamily: 'Poppins, monospace',
    lineNumbers: true,
    wordWrap: true,
    minimap: false
  });
  
  editors[tabId] = {
    editor: editor,
    name: tabName,
    content: content
  };
  
  if (document.getElementById('typing-animation')?.checked) {
    addTypingAnimation(editor);
  }
  
  switchToTab(tabId);
  
  return tabId;
}

function switchToTab(tabId) {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  const activeTabButton = document.querySelector(`[data-tab="${tabId}"]`);
  if (activeTabButton) activeTabButton.classList.add('active');
  
  Object.keys(editors).forEach(id => {
    const container = document.getElementById(`editor-${id}`);
    if (container) {
      container.style.display = id === tabId ? 'block' : 'none';
    }
  });
  
  activeEditor = editors[tabId]?.editor;
  
  if (activeEditor && activeEditor.layout) {
    setTimeout(() => {
      activeEditor.layout();
    }, 100);
  }
}

function closeTab(tabId) {
  const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
  const editorContainer = document.getElementById(`editor-${tabId}`);
  
  if (tabButton) tabButton.remove();
  if (editorContainer) editorContainer.remove();

  if (editors[tabId]?.editor) {
    editors[tabId].editor.dispose();
  }
  
  delete editors[tabId];
  
  const remainingTabs = Object.keys(editors);
  if (remainingTabs.length > 0) {
    switchToTab(remainingTabs[0]);
  } else {
    createNewTab();
  }
}

function addTypingAnimation(editor) {
  const originalSetValue = editor.setValue;
  editor.setValue = function(value) {
    originalSetValue.call(this, value);
    this.wrapper.style.animation = 'typing 0.3s ease';
    setTimeout(() => {
      this.wrapper.style.animation = '';
    }, 300);
  };
}

function postToMonacoEditor(message) {
  const iframe = document.getElementById('monaco-iframe');
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(message, '*');
  }
}

function initEditorActions() {
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      postToMonacoEditor({ type: 'save' });
    });
  }
  const loadBtn = document.getElementById('load-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      postToMonacoEditor({ type: 'load' });
    });
  }
  const clearBtn = document.getElementById('clear-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      postToMonacoEditor({ type: 'clear' });
    });
  }
}

function saveCurrentFile() {
  if (!activeEditor) {
    Toast.show('No active editor', 'error');
    return;
  }
  
  const content = activeEditor.getValue();
  if (!content.trim()) {
    Toast.show('No content to save', 'error');
    return;
  }
  
  if (window.electronAPI) {
    window.electronAPI.saveFile(content);
  } else {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.lua';
    a.click();
    URL.revokeObjectURL(url);
    Toast.show('File saved successfully!', 'success');
  }
  
  addConsoleLog('File saved successfully', 'info');
}

function loadFile() {
  if (window.electronAPI) {
    window.electronAPI.loadFile();
  } else {    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.lua,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (activeEditor) {
            activeEditor.setValue(e.target.result);
            Toast.show('File loaded successfully!', 'success');
            addConsoleLog(`File loaded: ${file.name}`, 'info');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }
}

function clearEditor() {
  if (activeEditor) {
    activeEditor.setValue('');
    Toast.show('Editor cleared', 'info');
    addConsoleLog('Editor cleared', 'info');
  }
}

function addConsoleLog(message, type = 'info') {
  const consoleOutput = document.getElementById('console-output');
  if (!consoleOutput) return;
  
  const logEntry = document.createElement('div');
  logEntry.className = `console-log ${type}`;
  logEntry.innerHTML = `
    <span class="timestamp">[${new Date().toLocaleTimeString()}]</span>
    <span class="message">${message}</span>
  `;
  
  consoleOutput.appendChild(logEntry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function initSettings() {
  const fontSizeSlider = document.getElementById('font-size');
  const fontSizeValue = document.getElementById('font-size-value');
  if (fontSizeSlider && fontSizeValue) {
    fontSizeSlider.addEventListener('input', (e) => {
      const size = e.target.value;
      fontSizeValue.textContent = `${size}px`;
      postToMonacoEditor({ type: 'setFontSize', value: parseInt(size) });
    });
  }
  const checkboxes = [
    { id: 'auto-save', setting: 'autoSave' },
    { id: 'line-numbers', setting: 'lineNumbers' },
    { id: 'word-wrap', setting: 'wordWrap' },
    { id: 'minimap', setting: 'minimap' },
    { id: 'typing-animation', setting: 'typingAnimation' }
  ];
  checkboxes.forEach(({ id, setting }) => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        postToMonacoEditor({ type: 'setOption', option: setting, value: e.target.checked });
      });
    }
  });
}

function initScriptHub() {
  const scripts = [
    {
      name: 'Infinite Yield Admin',
      description: 'Infinite Yield Admin Script',
      author: 'EdgeI',
      downloads: '1M',
      category: 'admin',
      content: `-- Infinite Yield Admin Script
-- Load the admin commands
loadstring(game:HttpGet('https://raw.githubusercontent.com/EdgeIY/infiniteyield/master/source'))()`
    },
    {
      name: 'ESP Script',
      description: 'Powerful ESP Script',
      author: 'ScriptHub',
      downloads: '1M',
      category: 'esp',
      content: `-- ESP Script
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

-- ESP Configuration
local ESP = {
    enabled = true,
    boxColor = Color3.fromRGB(255, 0, 0),
    textColor = Color3.fromRGB(255, 255, 255)
}

-- Create ESP for players
for _, player in pairs(Players:GetPlayers()) do
    if player ~= Players.LocalPlayer then
        -- ESP implementation here
        print("ESP created for: " .. player.Name)
    end
end`
    },
    {
      name: 'Steal A Brainrot',
      description: 'Steal A Brainrot Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'exploit',
      content: `-- Auto Farm Script
print("Steal A Brainrot")`
    },
    {
      name: 'Grow A Garden',
      description: 'Grow A Garden Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'exploit',
      content: `-- Speed Hack Script
print("Grow A Garden")`
    },
    {
      name: 'Anti AFK',
      description: 'Anti AFK Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'utility',
      content: `-- Anti AFK Script
local VirtualUser = game:GetService("VirtualUser")
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

while true do
    wait(30)
    VirtualUser:CaptureController()
    VirtualUser:ClickButton2(Vector2.new())
    print("Anti AFK pulse sent")
end`
    },
    {
      name: 'Infinite Jump',
      description: 'Infinite Jump Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'game',
      content: `-- Infinite Jump Script
print("Infinite Jump")`
    },
    {
      name: 'Teleport Script',
      description: 'Teleport Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'utility',
      content: `-- Teleport Script
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer
local Character = LocalPlayer.Character or LocalPlayer.CharacterAdded:Wait()

function teleportToPlayer(playerName)
    local targetPlayer = Players:FindFirstChild(playerName)
    if targetPlayer and targetPlayer.Character and targetPlayer.Character:FindFirstChild("HumanoidRootPart") then
        Character:FindFirstChild("HumanoidRootPart").CFrame = targetPlayer.Character.HumanoidRootPart.CFrame
        print("Teleported to: " .. playerName)
    end
end`
    },
    {
      name: 'Aimbot Script',
      description: 'Aimbot Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'exploit',
      content: `-- Aimbot Script
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local LocalPlayer = Players.LocalPlayer

local Aimbot = {
    enabled = true,
    fov = 100,
    smoothness = 0.1
}

RunService.Heartbeat:Connect(function()
    if Aimbot.enabled then
        -- Aimbot implementation here
        print("Aimbot active")
    end
end)`
    },
    {
      name: 'Wall Hack Script',
      description: 'Wall Hack Script',
      author: 'Blaze',
      downloads: '1M',
      category: 'exploit',
      content: `-- Wall Hack Script
local Players = game:GetService("Players")
local LocalPlayer = Players.LocalPlayer

local WallHack = {
    enabled = true,
    transparency = 0.5
}

for _, part in pairs(workspace:GetDescendants()) do
    if part:IsA("BasePart") then
        part.Material = Enum.Material.ForceField
        part.Transparency = WallHack.transparency
    end
end

print("Wall hack applied!")`
    }
  ];
  
  const scriptsGrid = document.getElementById('scripts-grid');
  if (scriptsGrid) {
    scripts.forEach(script => {
      const scriptCard = document.createElement('div');
      scriptCard.className = 'script-card';
      scriptCard.setAttribute('data-category', script.category);
      scriptCard.innerHTML = `
        <div class="script-card-header">
          <h3>${script.name}</h3>
          <span class="downloads">${script.downloads}</span>
        </div>
        <p>${script.description}</p>
        <div class="script-card-footer">
          <span class="author">by ${script.author}</span>
          <button class="download-btn">Open in Editor</button>
        </div>
      `;
      
      const downloadBtn = scriptCard.querySelector('.download-btn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          switchTab('editor');
          postToMonacoEditor({ type: 'setValue', value: script.content, name: script.name });
          Toast.show(`${script.name} opened in editor!`, 'success');
        });
      }
      
      scriptsGrid.appendChild(scriptCard);
    });
  }
  
  const filterTags = document.querySelectorAll('.filter-tag');
  filterTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const filter = tag.getAttribute('data-filter');
      
      filterTags.forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      
      const scriptCards = document.querySelectorAll('.script-card');
      scriptCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });
    
  const searchInput = document.getElementById('script-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      const scriptCards = document.querySelectorAll('.script-card');
      
      scriptCards.forEach(card => {
        const name = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const author = card.querySelector('.author').textContent.toLowerCase();
        
        if (name.includes(query) || description.includes(query) || author.includes(query)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }
}

window.switchToTab = switchTab; 