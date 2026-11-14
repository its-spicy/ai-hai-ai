let activeSemesterId = null;
let activeSubjectId = null;
let currentActiveWeek = null;
let curriculumData = (typeof CURRICULUM !== 'undefined') ? CURRICULUM : null;

const semestersList = document.getElementById('semestersList');
const floatingSubpage = document.getElementById('floatingSubpage');
const floatingTabs = document.getElementById('floatingTabs');
const weeksList = document.getElementById('weeksList');
const notesTarget = document.getElementById('notesTarget');
const activeSubjectMeta = document.getElementById('activeSubjectMeta');
const closeBtn = document.getElementById('closeBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const pdfBtn = document.getElementById('pdfBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const offlineDownloadBtn = document.getElementById('offlineDownloadBtn');

function getCurriculum() {
  return curriculumData || (typeof CURRICULUM !== 'undefined' ? CURRICULUM : { semesters: [] });
}

function getSubjectPrefix(subjectId) {
  const map = {
    'itw': 'IWT',
    'ml2': 'ML2',
    'oop': 'OOP',
    'bdm': 'BDM'
  };
  return map[subjectId] || (subjectId ? subjectId.toUpperCase() : 'SUB');
}

async function init() {
  initTheme();
  renderSemesters();
  bindEvents();
  await loadFreshCurriculum();
}

async function loadFreshCurriculum() {
  try {
    const res = await fetch(`./curriculum.json?_t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const freshData = await res.json();
      if (JSON.stringify(freshData) !== JSON.stringify(curriculumData)) {
        curriculumData = freshData;
        renderSemesters();
        if (activeSemesterId && floatingSubpage.classList.contains('active')) {
          const sem = getCurriculum().semesters.find(s => s.id === activeSemesterId);
          if (sem) {
            const subj = sem.subjects.find(s => s.id === activeSubjectId) || sem.subjects[0];
            renderTabs(sem);
            renderSubject(subj);
          }
        }
      }
    }
  } catch (e) {
    // Fallback to static CURRICULUM
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === 'dark' ? 'light' : 'dark';
  }
  const iframe = document.getElementById('activeNoteIframe');
  if (iframe) {
    applyThemeToIframe(iframe);
  }
}

function applyThemeToIframe(iframe) {
  try {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    if (iframe && iframe.contentDocument && iframe.contentDocument.documentElement) {
      iframe.contentDocument.documentElement.setAttribute('data-theme', currentTheme);
    }
  } catch (e) {
    // Cross-origin fallback
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
}

function renderSemesters() {
  semestersList.innerHTML = '';
  const curr = getCurriculum();

  curr.semesters.forEach(sem => {
    const block = document.createElement('div');
    block.className = 'semester-block';
    block.dataset.id = sem.id;

    const isEmpty = !sem.subjects || sem.subjects.length === 0;

    block.innerHTML = `
      <div class="sem-header">
        <button class="sem-btn" aria-expanded="false">
          <span class="sem-title">${sem.title}</span>
        </button>
        <div class="sem-actions">
          <button class="sem-snapshot-btn" data-sem="${sem.id}" title="Download all ${sem.title} notes as ZIP">snapshot</button>
          <span class="sem-num">0${sem.id}</span>
        </div>
      </div>
      <div class="sem-body">
        ${isEmpty ? `
          <div class="empty-sem-container">
            <span class="empty-sem-text">${sem.emptyMessage || 'नहीं है मेरे पास'}</span>
          </div>
        ` : `
          <div class="subjects-row">
            ${sem.subjects.map(s => `
              <div class="subj-item" data-sem="${sem.id}" data-id="${s.id}">
                <div class="subj-name">${s.name}</div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    const btn = block.querySelector('.sem-btn');
    btn.addEventListener('click', () => {
      const isOpen = block.classList.contains('open');
      document.querySelectorAll('.semester-block.open').forEach(b => {
        if (b !== block) {
          b.classList.remove('open');
          const otherBtn = b.querySelector('.sem-btn');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });
      block.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', (!isOpen).toString());
    });

    const snapshotBtn = block.querySelector('.sem-snapshot-btn');
    if (snapshotBtn) {
      snapshotBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSemesterSnapshot(sem.id, snapshotBtn);
      });
    }

    block.querySelectorAll('.subj-item').forEach(card => {
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        openFloatingSubpage(parseInt(card.dataset.sem, 10), card.dataset.id);
      });
    });

    semestersList.appendChild(block);
  });
}

function openFloatingSubpage(semId, subjectId) {
  const sem = getCurriculum().semesters.find(s => s.id === semId);
  if (!sem || !sem.subjects || sem.subjects.length === 0) return;

  activeSemesterId = semId;
  const subj = sem.subjects.find(s => s.id === subjectId) || sem.subjects[0];
  activeSubjectId = subj.id;

  renderTabs(sem);
  renderSubject(subj);

  floatingSubpage.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderTabs(sem) {
  floatingTabs.innerHTML = '';
  sem.subjects.forEach(s => {
    const tab = document.createElement('button');
    tab.className = `floating-tab ${s.id === activeSubjectId ? 'active' : ''}`;
    tab.textContent = s.name;
    tab.addEventListener('click', () => {
      if (activeSubjectId === s.id) return;
      activeSubjectId = s.id;
      floatingTabs.querySelectorAll('.floating-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSubject(s);
    });
    floatingTabs.appendChild(tab);
  });
}

function renderSubject(subj) {
  activeSubjectMeta.textContent = `Sem 0${activeSemesterId} / ${subj.name}`;

  weeksList.innerHTML = '';
  if (subj.weeks && subj.weeks.length > 0) {
    subj.weeks.forEach((w, idx) => {
      const btn = document.createElement('button');
      btn.className = `week-btn ${idx === 0 ? 'active' : ''}`;
      btn.textContent = `Week ${String(w.week).padStart(2, '0')}`;
      btn.addEventListener('click', () => {
        if (currentActiveWeek && currentActiveWeek.week === w.week) return;
        weeksList.querySelectorAll('.week-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderWeekContent(w);
      });
      weeksList.appendChild(btn);
    });

    // Load ONLY the first week initially
    renderWeekContent(subj.weeks[0]);
  } else {
    notesTarget.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No notes available for this subject yet.</div>';
    currentActiveWeek = null;
    updatePdfButton(null);
  }
}

function updatePdfButton(week) {
  if (!pdfBtn) return;
  if (week && week.pdfPath) {
    const prefix = getSubjectPrefix(activeSubjectId);
    const fileName = `${prefix}_Week${week.week}.pdf`;
    pdfBtn.textContent = 'pdf ⤓';
    pdfBtn.title = `Download ${fileName}`;
    pdfBtn.style.display = 'inline-flex';
  } else {
    pdfBtn.style.display = 'none';
  }
}

function renderWeekContent(week) {
  currentActiveWeek = week;
  updatePdfButton(week);

  if (week.htmlPath) {
    const prefix = getSubjectPrefix(activeSubjectId);
    notesTarget.innerHTML = `
      <div class="note-viewer-wrapper">
        <div class="note-loading-indicator" id="noteLoader">
          <div class="loader-spinner"></div>
          <span>Loading ${prefix} Week ${String(week.week).padStart(2, '0')}...</span>
        </div>
        <iframe class="notes-frame" id="activeNoteIframe" src="${week.htmlPath}" title="${week.title || 'Notes'}"></iframe>
      </div>
    `;
    const iframe = document.getElementById('activeNoteIframe');
    const loader = document.getElementById('noteLoader');
    if (iframe) {
      const handleLoad = () => {
        applyThemeToIframe(iframe);
        setupIframeCodeCopy(iframe);
        if (loader) loader.style.display = 'none';
      };

      iframe.onload = handleLoad;
      // Safety timeout to prevent infinite loader
      setTimeout(() => {
        if (loader) loader.style.display = 'none';
        setupIframeCodeCopy(iframe);
      }, 1500);
    }
  } else if (week.content) {
    notesTarget.innerHTML = week.content;
    setupCodeCopyInElement(notesTarget);
  } else {
    notesTarget.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted);">No content available for this week.</div>';
  }
}

function setupIframeCodeCopy(iframe) {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    if (!doc || !doc.body) return;

    if (!doc.getElementById('code-copy-style-injected')) {
      const style = doc.createElement('style');
      style.id = 'code-copy-style-injected';
      style.textContent = `
        .code-block-wrapper {
          position: relative !important;
          margin-bottom: 16px !important;
        }
        .code-block-wrapper pre {
          margin-bottom: 0 !important;
        }
        .code-copy-btn {
          position: absolute;
          top: 8px;
          right: 8px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 8px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 11px;
          line-height: 1;
          color: #555555;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 4px;
          cursor: pointer;
          opacity: 0.6;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          transition: all 0.15s ease;
          z-index: 10;
          user-select: none;
        }
        .code-block-wrapper:hover .code-copy-btn,
        .code-copy-btn:focus-visible {
          opacity: 1;
        }
        .code-copy-btn:hover {
          opacity: 1;
          color: #111111;
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.35);
        }
        .code-copy-btn.copied {
          opacity: 1 !important;
          color: #166534 !important;
          background: #f0fdf4 !important;
          border-color: #86efac !important;
        }
        [data-theme="dark"] .code-copy-btn {
          color: #a0a0a0;
          background: rgba(26, 26, 26, 0.9);
          border-color: rgba(255, 255, 255, 0.15);
        }
        [data-theme="dark"] .code-copy-btn:hover {
          color: #ffffff;
          background: #333333;
          border-color: rgba(255, 255, 255, 0.35);
        }
        [data-theme="dark"] .code-copy-btn.copied {
          color: #4ade80 !important;
          background: rgba(20, 45, 28, 0.95) !important;
          border-color: #22c55e !important;
        }
      `;
      doc.head.appendChild(style);
    }

    const preElements = doc.querySelectorAll('pre');
    preElements.forEach((pre) => {
      if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;
      if (pre.querySelector('.code-copy-btn')) return;

      const wrapper = doc.createElement('div');
      wrapper.className = 'code-block-wrapper';
      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(pre);

      const btn = doc.createElement('button');
      btn.className = 'code-copy-btn';
      btn.type = 'button';
      btn.title = 'Copy code';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.innerHTML = `
        <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span class="copy-text">copy</span>
      `;

      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const codeEl = pre.querySelector('code');
        const textToCopy = (codeEl ? codeEl.innerText : pre.innerText).trim();

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(textToCopy);
          } else {
            const ta = doc.createElement('textarea');
            ta.value = textToCopy;
            ta.style.position = 'fixed';
            ta.style.top = '0';
            ta.style.left = '0';
            ta.style.opacity = '0';
            doc.body.appendChild(ta);
            ta.focus();
            ta.select();
            doc.execCommand('copy');
            doc.body.removeChild(ta);
          }

          btn.classList.add('copied');
          btn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span class="copy-text">copied!</span>
          `;

          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = `
              <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span class="copy-text">copy</span>
            `;
          }, 1800);
        } catch (copyErr) {
          console.error('Copy failed:', copyErr);
        }
      });

      wrapper.appendChild(btn);
    });
  } catch (err) {
    console.warn('Could not inject copy buttons into note:', err);
  }
}

function setupCodeCopyInElement(container) {
  if (!container) return;
  const preElements = container.querySelectorAll('pre');
  preElements.forEach((pre) => {
    if (pre.parentElement && pre.parentElement.classList.contains('code-block-wrapper')) return;
    if (pre.querySelector('.code-copy-btn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const btn = document.createElement('button');
    btn.className = 'code-copy-btn';
    btn.type = 'button';
    btn.title = 'Copy code';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.innerHTML = `
      <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span class="copy-text">copy</span>
    `;

    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const codeEl = pre.querySelector('code');
      const textToCopy = (codeEl ? codeEl.innerText : pre.innerText).trim();

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        }
        btn.classList.add('copied');
        btn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="copy-text">copied!</span>
        `;
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = `
            <svg class="copy-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span class="copy-text">copy</span>
          `;
        }, 1800);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });

    wrapper.appendChild(btn);
  });
}

function toggleFullscreen(forceState) {
  const isNowFs = (forceState !== undefined)
    ? forceState
    : !floatingSubpage.classList.contains('is-fullscreen');

  floatingSubpage.classList.toggle('is-fullscreen', isNowFs);
  if (fullscreenBtn) {
    fullscreenBtn.title = isNowFs ? 'Minimize full screen' : 'Full screen';
    fullscreenBtn.setAttribute('aria-label', isNowFs ? 'Minimize full screen' : 'Full screen');
  }
}

async function handleSemesterSnapshot(semId, btn) {
  const curr = getCurriculum();
  const sem = curr.semesters.find(s => s.id === semId);
  if (!sem) return;

  const pdfList = [];
  if (sem.subjects) {
    sem.subjects.forEach(subj => {
      const subjFolderName = (subj.name || subj.id).replace(/[/\\:*?"<>|]/g, '_').trim();
      if (subj.weeks) {
        subj.weeks.forEach(w => {
          if (w.pdfPath) {
            const prefix = getSubjectPrefix(subj.id);
            const fileName = `${prefix}_Week${w.week}.pdf`;
            pdfList.push({
              url: w.pdfPath,
              folder: subjFolderName,
              fileName: fileName,
              subjectName: subj.name,
              week: w.week
            });
          }
        });
      }
    });
  }

  // If semester has no notes (Semesters 1-3)
  if (pdfList.length === 0) {
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<span style="color:#e53e3e; font-weight:700;">नहीं है मेरे पास</span>`;
    btn.style.borderColor = '#e53e3e';
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.style.borderColor = '';
    }, 2000);
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.innerHTML = `<span>packaging 0/${pdfList.length}...</span>`;

  try {
    if (typeof JSZip === 'undefined') {
      throw new Error("JSZip library not loaded");
    }

    const zip = new JSZip();
    const semFolderName = `Semester_${String(sem.id).padStart(2, '0')}`;
    const semFolder = zip.folder(semFolderName);

    let completed = 0;
    const batchSize = 5;

    for (let i = 0; i < pdfList.length; i += batchSize) {
      const batch = pdfList.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        try {
          const res = await fetch(item.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const buffer = await res.arrayBuffer();
          semFolder.folder(item.folder).file(item.fileName, buffer);
        } catch (fetchErr) {
          console.warn(`Failed to fetch ${item.url}:`, fetchErr);
        } finally {
          completed++;
          btn.innerHTML = `<span>packaging ${completed}/${pdfList.length}...</span>`;
        }
      }));
    }

    btn.innerHTML = `<span>zipping...</span>`;

    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'STORE' },
      (metadata) => {
        if (metadata.percent) {
          btn.innerHTML = `<span>zipping ${Math.floor(metadata.percent)}%...</span>`;
        }
      }
    );

    const zipFileName = `${semFolderName}_Notes_Snapshot.zip`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = zipFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 15000);

    btn.innerHTML = `<span>downloaded! ✓</span>`;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      btn.classList.remove('loading');
    }, 2500);

  } catch (err) {
    console.error('Error creating snapshot ZIP:', err);
    btn.innerHTML = `<span style="color:#e53e3e;">failed</span>`;
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.disabled = false;
      btn.classList.remove('loading');
    }, 2500);
  }
}

function handleDownloadPdf() {
  if (!currentActiveWeek || !currentActiveWeek.pdfPath) {
    window.print();
    return;
  }
  const prefix = getSubjectPrefix(activeSubjectId);
  const fileName = `${prefix}_Week${currentActiveWeek.week}.pdf`;

  const link = document.createElement('a');
  link.href = currentActiveWeek.pdfPath;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function close() {
  floatingSubpage.classList.remove('active');
  floatingSubpage.classList.remove('is-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.title = 'Full screen';
    fullscreenBtn.setAttribute('aria-label', 'Full screen');
  }
  document.body.style.overflow = '';
}

async function handleDownloadSiteOffline() {
  if (!offlineDownloadBtn) return;
  if (typeof JSZip === 'undefined') {
    alert('JSZip library not loaded. Please check your connection.');
    return;
  }

  const originalHtml = offlineDownloadBtn.innerHTML;
  offlineDownloadBtn.disabled = true;
  offlineDownloadBtn.classList.add('loading');
  offlineDownloadBtn.innerHTML = '<span>collecting...</span>';

  try {
    const curr = getCurriculum();
    const filesToFetch = [
      'index.html',
      'style.css',
      'app.js',
      'curriculum.js',
      'curriculum.json',
      'lib/jszip.min.js',
      'Libron_Web/Libron-Regular.woff2',
      'Libron_Web/Libron-Regular.ttf',
      'Libron_Web/Libron-Bold.woff2',
      'Libron_Web/Libron-Bold.ttf',
      'Libron_Web/Libron-Italic.woff2',
      'Libron_Web/Libron-Italic.ttf',
      'Libron_Web/Libron-BoldItalic.woff2',
      'Libron_Web/Libron-BoldItalic.ttf'
    ];

    // Collect all HTML notes only from curriculum
    if (curr.semesters) {
      curr.semesters.forEach(sem => {
        if (sem.subjects) {
          sem.subjects.forEach(subj => {
            if (subj.weeks) {
              subj.weeks.forEach(w => {
                if (w.htmlPath && !filesToFetch.includes(w.htmlPath)) {
                  filesToFetch.push(w.htmlPath);
                }
              });
            }
          });
        }
      });
    }

    const zip = new JSZip();
    let completed = 0;
    const batchSize = 6;

    for (let i = 0; i < filesToFetch.length; i += batchSize) {
      const batch = filesToFetch.slice(i, i + batchSize);
      await Promise.all(batch.map(async (filePath) => {
        try {
          const res = await fetch(`./${filePath}`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const isBinary = filePath.endsWith('.woff2') || filePath.endsWith('.ttf');
          if (isBinary) {
            const buf = await res.arrayBuffer();
            zip.file(filePath, buf);
          } else {
            const text = await res.text();
            zip.file(filePath, text);
          }
        } catch (err) {
          console.warn(`Could not bundle ${filePath}:`, err);
        } finally {
          completed++;
          offlineDownloadBtn.innerHTML = `<span>packaging ${completed}/${filesToFetch.length}...</span>`;
        }
      }));
    }

    offlineDownloadBtn.innerHTML = '<span>compressing...</span>';

    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      (metadata) => {
        if (metadata.percent) {
          offlineDownloadBtn.innerHTML = `<span>zipping ${Math.floor(metadata.percent)}%...</span>`;
        }
      }
    );

    const downloadName = 'applied-ai-notes-offline.zip';
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 15000);

    offlineDownloadBtn.innerHTML = '<span>downloaded! ✓</span>';
    setTimeout(() => {
      offlineDownloadBtn.innerHTML = originalHtml;
      offlineDownloadBtn.disabled = false;
      offlineDownloadBtn.classList.remove('loading');
    }, 2500);

  } catch (err) {
    console.error('Offline site download failed:', err);
    offlineDownloadBtn.innerHTML = '<span style="color:#e53e3e;">failed</span>';
    setTimeout(() => {
      offlineDownloadBtn.innerHTML = originalHtml;
      offlineDownloadBtn.disabled = false;
      offlineDownloadBtn.classList.remove('loading');
    }, 2500);
  }
}

function bindEvents() {
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
  if (offlineDownloadBtn) {
    offlineDownloadBtn.addEventListener('click', handleDownloadSiteOffline);
  }
  closeBtn.addEventListener('click', close);
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => toggleFullscreen());
  }
  if (pdfBtn) {
    pdfBtn.addEventListener('click', handleDownloadPdf);
  }

  floatingSubpage.addEventListener('click', (e) => {
    if (e.target === floatingSubpage) close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && floatingSubpage.classList.contains('active')) {
      if (floatingSubpage.classList.contains('is-fullscreen')) {
        toggleFullscreen(false);
      } else {
        close();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
