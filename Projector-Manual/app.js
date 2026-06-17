/* ═══════════════════════════════════════════════
   投影機選單導覽 — 共用邏輯
   TPAC AV TEAM
   ═══════════════════════════════════════════════

   使用方式（在各頁面的 <script> 末尾呼叫）：
     initApp(DATA, ALIAS);

   DATA  — 該機型的選單陣列（見各頁面定義）
   ALIAS — 搜尋別名對照表（可傳入 {} 若無別名）
   ═══════════════════════════════════════════════ */

/* ── Debounce timer ── */
let _searchTimer;

/* ── Build searchable text for a single node ── */
function buildSearchText(item) {
    return [
        item.cn,
        item.en,
        item.badge,
        ...(item.aliases || []),
        ...(item.options || [])
    ].filter(Boolean).join(' ').toLowerCase();
}

/* ── Render tree (支援 hot 屬性) ── */
function draw(data, parent, level = 0) {
    data.forEach(item => {
        const node = document.createElement('div');
        node.className = [
            'node',
            `level-${level}`,
            item.children ? '' : 'leaf',
            item.hot      ? 'hot' : ''
        ].filter(Boolean).join(' ');

        const label = document.createElement('div');
        label.className = 'label';

        let h = `<span class="cn-text">${item.cn}</span>`;
        if (item.en)  h += `<span class="en-text">${item.en}</span>`;
        if (item.hot) h += `<span class="hot-badge">常用</span>`;
        if (item.badge) h += `<span class="badge">${item.badge}</span>`;
        label.innerHTML = h;

        label.dataset.search = buildSearchText(item);
        label.onclick = e => { e.stopPropagation(); node.classList.toggle('expanded'); };
        node.appendChild(label);

        if (item.options) {
            const box = document.createElement('div');
            box.className = 'options-box';
            item.options.forEach(o => {
                const d = document.createElement('div');
                d.className = 'option-item';
                d.textContent = o;
                box.appendChild(d);
            });
            node.appendChild(box);
        }

        if (item.children) {
            const wrap = document.createElement('div');
            wrap.className = 'children';
            draw(item.children, wrap, level + 1);
            node.appendChild(wrap);
        }

        parent.appendChild(node);
    });
}

/* ── Switch between tree / sop / fault views ── */
function switchView(view) {
    document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(view + 'Section').classList.add('active');
    document.getElementById('btn-' + view).classList.add('active');
    document.getElementById('scrollTarget').scrollTop = 0;
}

/* ── Expand / collapse all nodes ── */
function setAllExpanded(expand) {
    document.querySelectorAll('.node').forEach(n =>
        expand ? n.classList.add('expanded') : n.classList.remove('expanded')
    );
}

/* ── Search (debounced 120ms) ── */
function onSearch() {
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(_runSearch, 120);
}

function _runSearch() {
    const raw       = document.getElementById('searchInput').value.toLowerCase().trim();
    const clearBtn  = document.getElementById('clearSearch');
    const countBar  = document.getElementById('countBar');
    const countNum  = document.getElementById('countNum');
    const emptyState= document.getElementById('emptyState');

    clearBtn.classList.toggle('active', raw !== '');

    const nodes  = document.querySelectorAll('.node');
    const labels = document.querySelectorAll('.label');
    const cards  = document.querySelectorAll('.card');

    /* reset */
    if (!raw) {
        nodes.forEach(n  => n.classList.remove('hidden', 'expanded'));
        labels.forEach(l => l.classList.remove('highlight'));
        cards.forEach(c  => c.classList.remove('hidden'));
        countBar.classList.remove('visible');
        emptyState.classList.remove('visible');
        return;
    }

    /* expand alias pool */
    let pool = [raw];
    if (typeof ALIAS !== 'undefined') {
        for (const [key, vals] of Object.entries(ALIAS)) {
            if (vals.some(a => a.toLowerCase().includes(raw)) || key.toLowerCase().includes(raw))
                pool.push(key.toLowerCase());
        }
    }

    /* tree search */
    let treeHits = 0;
    nodes.forEach(n => n.classList.add('hidden'));
    labels.forEach(l => {
        const text = l.dataset.search || l.textContent.toLowerCase();
        const hit  = pool.some(k => text.includes(k));
        if (hit) {
            treeHits++;
            l.classList.add('highlight');
            /* reveal all ancestors */
            let cur = l.parentElement;
            while (cur && cur.classList.contains('node')) {
                cur.classList.remove('hidden');
                cur.classList.add('expanded');
                const p = cur.parentElement;
                cur = (p && p.classList.contains('children')) ? p.parentElement : null;
            }
        } else {
            l.classList.remove('highlight');
        }
    });

    /* card search (SOP / Fault) */
    let cardHits = 0;
    cards.forEach(c => {
        const hit = pool.some(k => c.textContent.toLowerCase().includes(k));
        c.classList.toggle('hidden', !hit);
        if (hit) cardHits++;
    });

    const total = treeHits + cardHits;
    countNum.textContent = total;
    countBar.classList.add('visible');
    emptyState.classList.toggle(
        'visible',
        treeHits === 0 && document.getElementById('treeSection').classList.contains('active')
    );

    /* auto-switch to tree if hits found there */
    if (treeHits > 0 && !document.getElementById('treeSection').classList.contains('active'))
        switchView('tree');
}

/* ── Clear search input ── */
function clearInput() {
    document.getElementById('searchInput').value = '';
    onSearch();
}

/* ── initApp: entry point called by each page ── */
function initApp(data) {
    draw(data, document.getElementById('menuTree'));
}
