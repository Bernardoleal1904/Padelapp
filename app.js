// State
let state = {
    players: [], // { id, name, gamesPlayed, wins, losses }
    tournaments: [], // { id, name, status, rounds: [] }
    activeTournamentId: null,
    currentView: 'dashboard'
};

// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyC8ix5NCf-UslVRigaRmM6Wq5znzy50GCk",
    authDomain: "padelapp-49e70.firebaseapp.com",
    databaseURL: "https://padelapp-49e70-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "padelapp-49e70",
    storageBucket: "padelapp-49e70.firebasestorage.app",
    messagingSenderId: "40679894266",
    appId: "1:40679894266:web:593bd3c5d40f3300c26d43"
};

let db = null;
let isFirebaseReady = false;

function initFirebase() {
    if (typeof firebase !== 'undefined') {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            isFirebaseReady = true;
            console.log('Firebase ligado!');
            setupFirebaseListener();
        } catch (e) {
            console.error('Erro ao iniciar Firebase:', e);
            updateSyncStatus('Erro Config Firebase', 'error');
        }
    } else {
        console.log('Firebase não configurado. A usar modo local offline.');
        updateSyncStatus('Modo Offline', 'default');
    }
}

// Data Persistence
let isSyncing = false;
let lastSyncStatus = '';
let saveTimeout = null;

// Debug / Status UI
function updateSyncStatus(msg, type) {
    let el = document.getElementById('sync-status');
    if (!el) {
        el = document.createElement('div');
        el.id = 'sync-status';
        el.style.position = 'fixed';
        el.style.bottom = '10px';
        el.style.right = '10px';
        el.style.padding = '5px 10px';
        el.style.borderRadius = '5px';
        el.style.fontSize = '0.8rem';
        el.style.zIndex = '9999';
        el.style.pointerEvents = 'none';
        document.body.appendChild(el);
    }
    
    el.textContent = msg;
    if (type === 'success') {
        el.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        el.style.color = '#006400';
        // Fade out after 2s
        setTimeout(() => { if(el.textContent === msg) el.style.opacity = '0'; }, 2000);
        el.style.opacity = '1';
    } else if (type === 'error') {
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        el.style.color = '#8b0000';
        el.style.opacity = '1';
    } else {
        el.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
        el.style.color = '#666';
        el.style.opacity = '1';
    }
}

function setupFirebaseListener() {
    if (!isFirebaseReady) return;
    
    const ref = db.ref('appState');
    ref.on('value', (snapshot) => {
        const remoteState = snapshot.val();
        if (remoteState) {
            // console.log('Receiving update from Firebase...');
            updateSyncStatus('Sincronizado', 'success');
            
            // Preservar navegação local
            const localView = state.currentView;
            const localParams = state.viewParams ? JSON.parse(JSON.stringify(state.viewParams)) : {};
            
            // Atualizar dados
            state.players = remoteState.players || [];
            state.tournaments = remoteState.tournaments || [];
            state.activeTournamentId = remoteState.activeTournamentId;
            state.updatedAt = remoteState.updatedAt;
            
            // Restaurar navegação
            // state.currentView = localView; // DISABLE FOR NOW TO FORCE DASHBOARD
            // state.viewParams = localParams;
            
            render();
        } else {
            // Se base de dados vazia, manter dados locais ou iniciar mock
            if (state.players.length === 0) initMockData();
        }
    }, (error) => {
        console.error('Firebase read error:', error);
        updateSyncStatus('Erro Firebase', 'error');
    });
}

async function loadState() {
    // Fallback to LocalStorage for offline/initial load
    try {
        const saved = localStorage.getItem('padelAppState');
        if (saved) {
            const localState = JSON.parse(saved);
            // Ensure structure is valid by merging or checking
            state = localState;
            if (!Array.isArray(state.players)) state.players = [];
            if (!Array.isArray(state.tournaments)) state.tournaments = [];
            if (!state.currentView) state.currentView = 'dashboard';
        }
    } catch (e) {
        console.error('Error loading local state:', e);
        // Reset state on error
        state = {
            players: [],
            tournaments: [],
            activeTournamentId: null,
            currentView: 'dashboard'
        };
    }

    // Tentar iniciar Firebase
    initFirebase();
    
    // Se não tiver firebase configurado e sem dados locais, inicia mock
    if (!isFirebaseReady && state.players.length === 0) {
        initMockData();
    }
}

function saveState() {
    state.updatedAt = Date.now();
    
    // Save locally (backup) - wrapped in try/catch so it doesn't block Firebase save
    try {
        localStorage.setItem('padelAppState', JSON.stringify(state));
        updateSyncStatus('Salvo Localmente', 'default');
    } catch (e) {
        console.error('Local storage save error:', e);
        // Continue to Firebase save...
    }
    
    // Save to Firebase (Debounced to save bandwidth)
    if (isFirebaseReady) {
        updateSyncStatus('A aguardar...', 'default');
        
        if (saveTimeout) clearTimeout(saveTimeout);
        
        saveTimeout = setTimeout(() => {
            updateSyncStatus('A enviar...', 'default');
            
            // Guardamos apenas os dados essenciais para partilhar
            const dataToSave = {
                players: state.players,
                tournaments: state.tournaments,
                activeTournamentId: state.activeTournamentId,
                updatedAt: state.updatedAt
            };
            
            db.ref('appState').set(dataToSave)
                .then(() => updateSyncStatus('Salvo na Nuvem', 'success'))
                .catch((e) => {
                    console.error('Firebase save error:', e);
                    updateSyncStatus('Erro Permissões', 'error');
                });
        }, 2000); // Wait 2 seconds before sending to cloud
    }
}

// Legacy polling removed
function startSync() {
    // No-op, handled by Firebase listener
}


// Mock Data Initialization
function initMockData() {
    const names = [
        'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Sofia', 'Miguel', 'Inês',
        'Rui', 'Beatriz', 'Tiago', 'Clara', 'Diogo', 'Mariana', 'Gonçalo', 'Rita',
        'Vasco', 'Joana', 'André', 'Catarina', 'Luís', 'Teresa', 'Bruno', 'Filipa'
    ];
    state.players = names.map((name, i) => ({
        id: i + 1,
        name: name,
        gamesPlayed: 0,
        wins: 0,
        losses: 0
    }));
    state.tournaments = [];
    state.activeTournamentId = null;
    saveState();
}

// Auth
let isAdmin = true; // FORCE ADMIN FOR GITHUB PAGES
// let isAdmin = localStorage.getItem('padelAuth') === 'true';

function login(username, password) {
    // Hardcoded credentials for simplicity
    // Case insensitive comparison for better UX on mobile
    if (username.toLowerCase() === 'admin' && password.toLowerCase() === 'padel') {
        isAdmin = true;
        localStorage.setItem('padelAuth', 'true');
        navigateTo('dashboard');
        return true;
    }
    console.log('Login failed. Received:', username, password);
    return false;
}

function logout() {
    isAdmin = false;
    localStorage.removeItem('padelAuth');
    navigateTo('dashboard');
}

function handleAuthClick() {
    if (isAdmin) {
        if(confirm('Tem a certeza que deseja sair?')) {
            logout();
        }
    } else {
        navigateTo('login');
    }
}

function updateNavbar() {
    // No auth button anymore in new index.html, so this is safe to be empty or just check
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.style.display = 'none'; // Hide if present
    }
}

function renderLogin(container) {
    const h1 = document.createElement('h1');
    h1.textContent = 'Login de Administrador';
    container.appendChild(h1);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.maxWidth = '400px';
    card.style.margin = '0 auto';

    const userLabel = document.createElement('label');
    userLabel.textContent = 'Utilizador';
    const userInput = document.createElement('input');
    userInput.type = 'text';
    userInput.placeholder = 'admin';

    const passLabel = document.createElement('label');
    passLabel.textContent = 'Password';
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = '•••••';

    const errorMsg = document.createElement('div');
    errorMsg.style.color = '#ef4444';
    errorMsg.style.marginBottom = '15px';
    errorMsg.style.minHeight = '1.2em';

    const loginBtn = document.createElement('button');
    loginBtn.textContent = 'Entrar';
    loginBtn.className = 'primary';
    loginBtn.style.width = '100%';
    loginBtn.onclick = () => {
        if (!login(userInput.value.trim(), passInput.value.trim())) {
            errorMsg.textContent = 'Utilizador ou password incorretos.';
        }
    };
    
    const backBtn = document.createElement('button');
    backBtn.textContent = 'Cancelar';
    backBtn.className = 'secondary';
    backBtn.style.width = '100%';
    backBtn.style.marginTop = '10px';
    backBtn.onclick = () => navigateTo('dashboard');

    card.appendChild(userLabel);
    card.appendChild(userInput);
    card.appendChild(passLabel);
    card.appendChild(passInput);
    card.appendChild(errorMsg);
    card.appendChild(loginBtn);
    card.appendChild(backBtn);
    
    container.appendChild(card);
}

function deleteTournament(id) {
    if (confirm('Tem a certeza que quer eliminar este torneio?')) {
        state.tournaments = state.tournaments.filter(t => t.id !== id);
        saveState();
        render();
    }
}

// Navigation
function navigateTo(view, params = {}) {
    try {
        state.currentView = view;
        state.viewParams = params;
        render();
    } catch (e) {
        console.error('Error navigating to ' + view, e);
        // Fallback to dashboard if render fails
        if (view !== 'dashboard') navigateTo('dashboard');
    }
}

function applyThemeFromStorage() {
    const saved = localStorage.getItem('padelTheme');
    if (saved === 'dark') {
        document.documentElement.classList.add('theme-dark');
    } else {
        document.documentElement.classList.remove('theme-dark');
    }
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('theme-dark');
    localStorage.setItem('padelTheme', isDark ? 'dark' : 'light');
}
// Render Logic
function render() {
    updateNavbar();
    const main = document.getElementById('main-content');
    if (!main) {
        console.error('Main content container not found!');
        return;
    }
    
    // Clear content safely
    while (main.firstChild) {
        main.removeChild(main.firstChild);
    }
    
    // Ensure state exists
    if (!state) state = { currentView: 'dashboard', players: [], tournaments: [] };
    
    // Debug logging
    console.log('Rendering view:', state.currentView);

    try {
        if (state.currentView === 'players') {
            renderPlayers(main);
        } else if (state.currentView === 'create-tournament') {
            renderCreateTournament(main);
        } else if (state.currentView === 'tournament-view') {
            renderTournamentView(main);
        } else if (state.currentView === 'game-detail') {
            renderGameDetail(main);
        } else if (state.currentView === 'player-profile') {
            renderPlayerProfile(main);
        } else if (state.currentView === 'ranking') {
            renderRanking(main);
        } else {
            // Default to dashboard for 'dashboard', 'login', or unknown
            renderDashboard(main);
        }
    } catch (e) {
        console.error('Error rendering view:', e);
        main.innerHTML = '<div style="color:red; padding:20px;">Erro: ' + e.message + ' <button onclick="location.reload()">Recarregar</button></div>';
    }
}

// Views

const isAdmin = true; // Forcing admin mode for all users on GitHub Pages
// const isAdmin = currentUser && currentUser.email === 'seu_email@gmail.com'; 

// 1. Dashboard
function renderDashboard(container) {
    const h1 = document.createElement('h1');
    h1.textContent = 'Dashboard';
    container.appendChild(h1);

    const topBar = document.createElement('div');
    topBar.style.display = 'flex';
    topBar.style.gap = '10px';
    topBar.style.marginBottom = '20px';
    topBar.style.flexWrap = 'wrap';

    if (isAdmin) {
        const createBtn = document.createElement('button');
        createBtn.textContent = 'Criar Jogo / Torneio';
        createBtn.className = 'primary';
        createBtn.onclick = () => navigateTo('create-tournament');
        topBar.appendChild(createBtn);

        const managePlayersBtn = document.createElement('button');
        managePlayersBtn.textContent = 'Gerir Jogadores';
        managePlayersBtn.className = 'secondary';
        managePlayersBtn.onclick = () => navigateTo('players');
        topBar.appendChild(managePlayersBtn);

        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset Dados';
        resetBtn.className = 'danger';
        resetBtn.onclick = () => {
            if(confirm('Tem a certeza? Todos os dados serão apagados.')) {
                localStorage.removeItem('padelAppState');
                // Se tiver firebase, limpar lá também
                if(isFirebaseReady) {
                    db.ref('appState').set(null);
                }
                initMockData();
                render();
            }
        };
        topBar.appendChild(resetBtn);
    }

    container.appendChild(topBar);

    const h2 = document.createElement('h2');
    h2.textContent = 'Torneios Ativos';
    h2.style.marginTop = '20px';
    container.appendChild(h2);

    const list = document.createElement('ul');
    if (state.tournaments.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'Nenhum torneio ativo.';
        li.style.justifyContent = 'center';
        li.style.color = 'var(--text-muted)';
        list.appendChild(li);
    } else {
        state.tournaments.forEach(t => {
            const li = document.createElement('li');
            
            const infoDiv = document.createElement('div');
            const statusColor = t.status === 'Finalizado' ? 'var(--text-muted)' : 'var(--accent-hover)';
            const displayName = t.name ? t.name : `Torneio #${t.id.slice(-4)}`;
            infoDiv.innerHTML = `
                <div style="font-weight:600; color:var(--primary); display:flex; align-items:center; gap:0.5rem;">
                    ${displayName}
                    <span style="font-size:0.75rem; background:${statusColor}; color:white; padding:2px 8px; border-radius:99px;">${t.status || 'Em Curso'}</span>
                </div>
                <div style="font-size:0.875rem; color:var(--text-muted); margin-top:0.25rem;">${t.rounds.length} Rondas • ${t.rounds[0].matches.length * 2 * 2} Jogadores</div>
            `;
            
            const btn = document.createElement('button');
            btn.textContent = 'Abrir';
            btn.className = 'primary';
            btn.style.padding = '0.5rem 1rem';
            btn.onclick = () => navigateTo('tournament-view', { id: t.id });

            li.appendChild(infoDiv);
            const btnGroup = document.createElement('div');
            btnGroup.appendChild(btn);

            if (isAdmin) {
                const delBtn = document.createElement('button');
                delBtn.textContent = '🗑️';
                delBtn.className = 'danger';
                delBtn.style.padding = '0.5rem 1rem';
                delBtn.style.marginLeft = '10px';
                delBtn.onclick = () => deleteTournament(t.id);
                btnGroup.appendChild(delBtn);
            }

            li.appendChild(btnGroup);
            list.appendChild(li);
        });
    }
    container.appendChild(list);
}

// 2. Gestão de Jogadores
function renderPlayers(container) {
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.justifyContent = 'space-between';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '20px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Jogadores';
    h1.style.marginBottom = '0';
    headerDiv.appendChild(h1);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Voltar';
    backBtn.className = 'secondary';
    backBtn.onclick = () => navigateTo('dashboard');
    headerDiv.appendChild(backBtn);

    container.appendChild(headerDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '10px';
    actionsDiv.style.marginBottom = '20px';
    actionsDiv.style.justifyContent = 'space-between';

    if (isAdmin) {
        const addDiv = document.createElement('div');
        addDiv.style.display = 'flex';
        addDiv.style.gap = '10px';
        addDiv.style.flex = '1';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Nome do Jogador';
        input.style.marginBottom = '0';
        
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Adicionar';
        addBtn.onclick = () => {
            if (input.value.trim()) {
                addPlayer(input.value.trim());
                render();
            }
        };

        addDiv.appendChild(input);
        addDiv.appendChild(addBtn);
        actionsDiv.appendChild(addDiv);

        if (state.players.length > 0) {
            const deleteAllBtn = document.createElement('button');
            deleteAllBtn.textContent = 'Apagar Todos';
            deleteAllBtn.className = 'danger';
            deleteAllBtn.onclick = () => {
                if (confirm('Tem a certeza que quer apagar TODOS os jogadores?')) {
                    state.players = [];
                    saveState();
                    render();
                }
            };
            actionsDiv.appendChild(deleteAllBtn);
        }

        container.appendChild(actionsDiv);
    }

    const list = document.createElement('ul');
    state.players.forEach(p => {
        const li = document.createElement('li');
        li.className = 'player-list-item';
        li.innerHTML = `<span>${p.name}</span>`;
        
        if (isAdmin) {
            const delBtn = document.createElement('button');
            delBtn.textContent = 'Remover';
            delBtn.className = 'danger';
            delBtn.onclick = () => {
                removePlayer(p.id);
                render();
            };
            li.appendChild(delBtn);
        }
        
        list.appendChild(li);
    });
    container.appendChild(list);
}

// 3. Criar Jogo / Torneio
 

// 4. Vista de Rondas
function renderTournamentView(container) {
    const tournamentId = state.viewParams.id;
    const currentTab = state.viewParams.tab || 'matches'; // 'matches' or 'ranking'
    const tournament = state.tournaments.find(t => t.id === tournamentId);
    
    if (!tournament) return navigateTo('dashboard');

    // Header
    const header = document.createElement('div');
    header.style.marginBottom = '20px';
    const displayName = tournament.name ? tournament.name : `Torneio #${tournament.id.slice(-4)}`;
    
    header.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin-bottom: 0.5rem;">
            <h1 style="margin:0;">${displayName}</h1>
            ${isAdmin ? '<button id="edit-name-btn" class="secondary" style="padding: 4px 8px; font-size: 1rem; border: none; background: transparent; cursor: pointer;">✏️</button>' : ''}
        </div>
        <div style="color:var(--text-muted)">${tournament.status || 'Em Curso'}</div>
    `;
    container.appendChild(header);

    const editBtn = document.getElementById('edit-name-btn');
    if (editBtn) {
        editBtn.onclick = () => {
            const newName = prompt('Novo nome para o torneio:', tournament.name || '');
            if (newName !== null) {
                tournament.name = newName.trim();
                saveState();
                render();
            }
        };
    }

    // Tabs
    const tabsContainer = document.createElement('div');
    tabsContainer.style.display = 'flex';
    tabsContainer.style.gap = '10px';
    tabsContainer.style.marginBottom = '20px';
    tabsContainer.style.borderBottom = '1px solid var(--border)';
    
    const createTab = (id, label) => {
        const icons = { matches: '📋', ranking: '📈', distribution: '📊' };
        const btn = document.createElement('button');
        btn.innerHTML = `<span style="margin-right:6px">${icons[id] || ''}</span>${label}`;
        btn.style.background = currentTab === id ? 'var(--bg-body)' : 'transparent';
        btn.style.border = 'none';
        btn.style.borderBottom = currentTab === id ? '2px solid var(--primary)' : '2px solid transparent';
        btn.style.borderRadius = '0';
        btn.style.padding = '10px 20px';
        btn.style.fontWeight = currentTab === id ? '700' : '500';
        btn.style.color = currentTab === id ? 'var(--primary)' : 'var(--text-muted)';
        btn.onclick = () => {
            console.log('Switching tab to:', id);
            state.viewParams.tab = id;
            render();
        };
        return btn;
    };

    tabsContainer.appendChild(createTab('matches', 'Jogos'));
    tabsContainer.appendChild(createTab('ranking', 'Classificação'));
    if (tournament.type === 'swiss20') {
        tabsContainer.appendChild(createTab('distribution', 'Campos'));
    }
    container.appendChild(tabsContainer);

    // Content
    if (currentTab === 'matches') {
        renderTournamentMatches(container, tournament);
    } else if (currentTab === 'ranking') {
        renderTournamentRanking(container, tournament);
    } else if (currentTab === 'distribution') {
        renderTournamentDistribution(container, tournament);
    }
}

function renderTournamentDistribution(container, tournament) {
    const h2 = document.createElement('h2');
    h2.textContent = 'Distribuição de Campos por Jogador';
    container.appendChild(h2);

    const stats = {};
    const courts = [1, 2, 3, 4, 5];
    
    // Initialize
    const allPlayerIds = new Set();
    tournament.rounds.forEach(r => r.matches.forEach(m => {
         m.team1.forEach(id => allPlayerIds.add(id));
         m.team2.forEach(id => allPlayerIds.add(id));
    }));
    
    allPlayerIds.forEach(id => {
        stats[id] = { id, name: state.players.find(p => p.id === id)?.name || '?', courts: {} };
        courts.forEach(c => stats[id].courts[c] = 0);
    });

    tournament.rounds.forEach(r => {
        r.matches.forEach(m => {
            [...m.team1, ...m.team2].forEach(pid => {
                if (stats[pid]) {
                    stats[pid].courts[m.courtId] = (stats[pid].courts[m.courtId] || 0) + 1;
                }
            });
        });
    });

    const sortedPlayers = Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.fontSize = '0.85rem';
    
    let headerHtml = '<tr><th style="text-align:left; padding:4px;">Jogador</th>';
    courts.forEach(c => headerHtml += `<th style="text-align:center; padding:4px; width:40px;">C${c}</th>`);
    headerHtml += '</tr>';

    let bodyHtml = '';
    sortedPlayers.forEach(p => {
        bodyHtml += `<tr><td style="font-weight:600; padding:4px;">${p.name}</td>`;
        courts.forEach(c => {
            const count = p.courts[c];
            const bg = count === 0 ? '' : count === 1 ? 'rgba(34, 197, 94, 0.1)' : count === 2 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            bodyHtml += `<td style="text-align:center; padding:4px; background:${bg};">${count}</td>`;
        });
        bodyHtml += '</tr>';
    });

    table.innerHTML = `<thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody>`;
    container.appendChild(table);
}

function renderTournamentMatches(container, tournament) {
    tournament.rounds.forEach((round, roundIndex) => {
        const roundHeader = document.createElement('div');
        roundHeader.style.cursor = 'pointer';
        roundHeader.style.background = 'var(--bg-card)';
        roundHeader.style.border = '1px solid var(--border)';
        roundHeader.style.borderRadius = 'var(--radius)';
        roundHeader.style.padding = '1rem';
        roundHeader.style.marginBottom = '10px';
        roundHeader.style.display = 'flex';
        roundHeader.style.justifyContent = 'space-between';
        roundHeader.style.alignItems = 'center';
        
        const isComplete = round.matches.every(m => m.played);
        const title = getRoundTitle(tournament, round, roundIndex);
        roundHeader.innerHTML = `
            <h3 style="margin:0">${title}</h3>
            <span style="font-size:0.875rem; color:${isComplete ? 'var(--accent)' : 'var(--text-muted)'}">${isComplete ? 'Completa' : 'Em Curso'}</span>
        `;
        container.appendChild(roundHeader);

        const roundContainer = document.createElement('div');
        // Check if desktop view (can be done via CSS media query, but inline style here for simplicity logic)
        // If 5 matches (10 players/20 players scenario), we might want a different grid.
        // Standard is grid-2 (2 columns).
        // User wants to see 5 matches simultaneously on PC screen.
        // We can check if it's a "Liga" or "Americano" with 5 courts.
        const isFiveCourts = round.matches.length >= 5;
        
        roundContainer.className = isFiveCourts ? 'grid-5-desktop' : 'grid-2';
        if (isFiveCourts) {
            // Apply custom style if not in CSS
            roundContainer.style.display = 'grid';
            roundContainer.style.gap = '15px';
            // We'll rely on a CSS class or inline media query logic
            // But since we can't easily inject CSS media queries inline effectively without style tag:
            // Let's just use a class and ensure CSS handles it or use auto-fill
             roundContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(250px, 1fr))';
        }

        roundContainer.style.marginBottom = '20px';
        
        const firstIncompleteIndex = tournament.rounds.findIndex(r => !r.matches.every(m => m.played));
        const shouldExpand = (firstIncompleteIndex === -1 && roundIndex === tournament.rounds.length - 1) || roundIndex === firstIncompleteIndex;
        roundContainer.style.display = shouldExpand ? 'grid' : 'none';

        roundHeader.onclick = () => {
            const isHidden = roundContainer.style.display === 'none';
            roundContainer.style.display = isHidden ? 'grid' : 'none';
        };

        round.matches.forEach((match, matchIndex) => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            
            const label = getMatchLabel(match);
            const p1 = state.players.find(p => p.id === match.team1[0])?.name || 'P1';
            const p2 = state.players.find(p => p.id === match.team1[1])?.name || 'P2';
            const p3 = state.players.find(p => p.id === match.team2[0])?.name || 'P3';
            const p4 = state.players.find(p => p.id === match.team2[1])?.name || 'P4';

            matchCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div class="court-label">Campo ${match.courtId}</div>
                    </div>
                    ${match.played ? '<span style="color:var(--accent); font-size:0.75rem;">✔ Terminado</span>' : ''}
                </div>
                ${label ? `<div style="margin-top:6px; font-size:0.85rem; color:var(--text-muted);">${label}</div>` : ''}
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.5rem;">
                    <div class="team">${p1} & ${p2}</div>
                    <div style="font-weight:700; color:var(--primary); font-size:1.25rem;">${match.score1}</div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div class="team">${p3} & ${p4}</div>
                    <div style="font-weight:700; color:var(--primary); font-size:1.25rem;">${match.score2}</div>
                </div>
            `;
            
            const btn = document.createElement('button');
            btn.textContent = match.played ? 'Editar' : 'Registar Resultado';
            btn.className = match.played ? '' : 'primary';
            btn.style.marginTop = '10px';
            btn.style.width = '100%';
            btn.onclick = () => navigateTo('game-detail', { tournamentId: tournament.id, roundIndex, matchIndex });
            
            matchCard.appendChild(btn);
            roundContainer.appendChild(matchCard);
        });
        container.appendChild(roundContainer);
    });
}

function getRoundTitle(tournament, round, roundIndex) {
    const phases = new Set(round.matches.map(m => m.phase));
    if (phases.has('final')) return 'Final';
    if (phases.has('third')) return 'Jogo 3º/4º';
    if (phases.has('semi')) return 'Meias-Finais';
    if (phases.has('quarter')) return 'Quartos de Final';
    if (phases.has('placement5_8_r1')) return 'Meias-Finais Perdedor';
    if (phases.has('placement5_6')) return 'Final 5º/6º';
    if (phases.has('placement7_8')) return 'Final 7º/8º';
    if (phases.has('group')) return 'Fase de Grupos';
    if (phases.has('league')) return `Liga - Jornada ${roundIndex + 1}`;
    if (phases.has('swiss_r1')) return 'Ronda 1 (Aleatória)';
    if (phases.has('swiss_r2')) return 'Ronda 2 (Aleatória)';
    if (phases.has('swiss_r3')) return 'Ronda 3 (Níveis)';
    if (phases.has('swiss_r4')) return 'Ronda 4 (Níveis)';
    if (phases.has('swiss_r5')) return 'Ronda 5 (Níveis)';
    return `Ronda ${roundIndex + 1}`;
}

function getMatchLabel(match) {
    const ph = match.phase;
    if (ph === 'final') return 'Final (1º/2º)';
    if (ph === 'third') return 'Jogo de 3º lugar';
    if (ph === 'semi') return 'Meia-Final';
    if (ph === 'quarter') return 'Quartos de Final';
    if (ph === 'placement5_8_r1') return 'Meia-Final dos Perdedor​es';
    if (ph === 'placement5_6') return 'Jogo 5º/6º';
    if (ph === 'placement7_8') return 'Jogo 7º/8º';
    if (ph === 'group') return match.group ? `Grupo ${match.group}` : 'Fase de Grupos';
    if (ph === 'league') return 'Liga';
    if (ph && ph.startsWith('swiss_r')) return `Ronda ${ph.split('_r')[1]}`;
    return '';
}

function renderTournamentRanking(container, tournament) {
    if (tournament.type === 'grupos') {
        const groupStats = {};
        Object.keys(tournament.groups || {}).forEach(g => { groupStats[g] = new Map(); });
        const key = (team) => team.slice().sort().join('-');
        tournament.rounds.forEach(r => r.matches.forEach(m => {
            if (m.phase !== 'group') return;
            const map = groupStats[m.group];
            const k1 = key(m.team1);
            const k2 = key(m.team2);
            if (!map.has(k1)) map.set(k1, { team: m.team1, wins: 0, played: 0, gw: 0, gl: 0 });
            if (!map.has(k2)) map.set(k2, { team: m.team2, wins: 0, played: 0, gw: 0, gl: 0 });
            if (!m.played) return;
            const s1 = map.get(k1);
            const s2 = map.get(k2);
            s1.played += 1;
            s2.played += 1;
            s1.gw += m.score1;
            s1.gl += m.score2;
            s2.gw += m.score2;
            s2.gl += m.score1;
            if (m.score1 > m.score2) s1.wins += 1;
            else if (m.score2 > m.score1) s2.wins += 1;
        }));
        const renderGroupTable = (gName, map) => {
            const arr = Array.from(map.values());
            arr.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                const bd = (b.gw - b.gl) - (a.gw - a.gl);
                if (bd !== 0) return bd;
                return b.gw - a.gw;
            });
            const table = document.createElement('table');
            table.style.marginBottom = '20px';
            table.innerHTML = `
                <thead>
                    <tr>
                        <th colspan="5" style="text-align:left">Grupo ${gName}</th>
                    </tr>
                    <tr>
                        <th style="width: 40px; text-align: center;">#</th>
                        <th style="text-align: left;">Dupla</th>
                        <th style="text-align: center;">Pontos</th>
                        <th style="text-align: center;">Jogos</th>
                        <th style="text-align: center;">Diferença</th>
                    </tr>
                </thead>
                <tbody>
                    ${arr.map((row, i) => {
                        const p1Obj = state.players.find(p => p.id === row.team[0]);
                        const p2Obj = state.players.find(p => p.id === row.team[1]);
                        const p1Html = p1Obj ? `<span style="cursor:pointer; color:var(--primary)" onclick="navigateTo('player-profile', {id:${p1Obj.id}})">${p1Obj.name}</span>` : '';
                        const p2Html = p2Obj ? `<span style="cursor:pointer; color:var(--primary)" onclick="navigateTo('player-profile', {id:${p2Obj.id}})">${p2Obj.name}</span>` : '';
                        
                        const diff = row.gw - row.gl;
                        const highlightClass = i < 2 ? 'rank-highlight' : '';
                        const tag = i >= 2 ? '<span style="font-size:0.75rem; color:var(--text-muted)">quadro dos perdedores</span>' : '';
                        return `
                            <tr class="${highlightClass}">
                                <td style="text-align: center;">${i + 1}</td>
                                <td style="font-weight:600; text-align: left;">${p1Html} & ${p2Html} ${tag}</td>
                                <td style="text-align: center;">${row.wins * 3}</td>
                                <td style="text-align: center;">${row.played}</td>
                                <td style="text-align: center;">${diff > 0 ? '+' : ''}${diff}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            `;
            container.appendChild(table);
        };
        Object.entries(groupStats).forEach(([g, map]) => renderGroupTable(g, map));
        const placements = computeFinalPlacements(tournament);
        if (placements.length > 0) {
            const finalTable = document.createElement('table');
            finalTable.style.marginTop = '10px';
            finalTable.innerHTML = `
                <thead>
                    <tr>
                        <th colspan="2" style="text-align:left">Classificação Final</th>
                    </tr>
                    <tr>
                        <th>Posição</th>
                        <th>Equipa</th>
                    </tr>
                </thead>
                <tbody>
                    ${placements.map((row, idx) => `
                        <tr class="${idx < 3 ? 'rank-highlight' : ''}">
                            <td>${row.pos}º</td>
                            <td style="font-weight:600">${getTeamName(row.team)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            `;
            container.appendChild(finalTable);
        }
        return;
    } else if (tournament.type === 'liga' || tournament.type === 'liga12') {
        const map = new Map();
        const key = (team) => team.slice().sort().join('-');
        tournament.rounds.forEach(r => r.matches.forEach(m => {
            if (m.phase !== 'league') return;
            const k1 = key(m.team1);
            const k2 = key(m.team2);
            if (!map.has(k1)) map.set(k1, { team: m.team1, wins: 0, draws: 0, played: 0, gw: 0, gl: 0 });
            if (!map.has(k2)) map.set(k2, { team: m.team2, wins: 0, draws: 0, played: 0, gw: 0, gl: 0 });
            if (!m.played) return;
            const s1 = map.get(k1);
            const s2 = map.get(k2);
            s1.played += 1;
            s2.played += 1;
            s1.gw += m.score1;
            s1.gl += m.score2;
            s2.gw += m.score2;
            s2.gl += m.score1;
            if (m.score1 > m.score2) s1.wins += 1;
            else if (m.score2 > m.score1) s2.wins += 1;
            else {
                s1.draws += 1;
                s2.draws += 1;
            }
        }));
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ap = (a.wins * 3) + (a.draws * 1);
            const bp = (b.wins * 3) + (b.draws * 1);
            if (bp !== ap) return bp - ap;
            const bd = (b.gw - b.gl) - (a.gw - a.gl);
            if (bd !== 0) return bd;
            return b.gw - a.gw;
        });
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th colspan="5" style="text-align:left">Liga (Duplas Fixas)</th>
                </tr>
                <tr>
                    <th>#</th>
                    <th>Dupla</th>
                    <th>Pontos</th>
                    <th>Jogos</th>
                    <th>Diferença</th>
                </tr>
            </thead>
            <tbody>
                ${arr.map((row, i) => {
                    const p1Obj = state.players.find(p => p.id === row.team[0]);
                    const p2Obj = state.players.find(p => p.id === row.team[1]);
                    const p1Html = p1Obj ? `<span style="cursor:pointer; color:var(--primary)" onclick="navigateTo('player-profile', {id:${p1Obj.id}, returnView: 'tournament-view', returnParams: {id: '${tournament.id}', tab: 'ranking'}})">${p1Obj.name}</span>` : '';
                    const p2Html = p2Obj ? `<span style="cursor:pointer; color:var(--primary)" onclick="navigateTo('player-profile', {id:${p2Obj.id}, returnView: 'tournament-view', returnParams: {id: '${tournament.id}', tab: 'ranking'}})">${p2Obj.name}</span>` : '';
                    const diff = row.gw - row.gl;
                    const highlightClass = i < 3 ? 'rank-highlight' : '';
                    const medalClass = i === 0 ? 'medal medal-gold' : i === 1 ? 'medal medal-silver' : i === 2 ? 'medal medal-bronze' : '';
                    const medalHtml = medalClass ? `<span class="${medalClass}">${i === 0 ? '1º' : i === 1 ? '2º' : '3º'}</span>` : '';
                    return `
                        <tr class="${highlightClass}">
                        <td>${i + 1}</td>
                        <td style="font-weight:600">${p1Html} & ${p2Html} ${medalHtml}</td>
                        <td>${(row.wins * 3) + (row.draws * 1)}</td>
                        <td>${row.played}</td>
                        <td>${diff > 0 ? '+' : ''}${diff}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        `;
        container.appendChild(table);
        return;
    }
    const stats = {};

    // Initialize stats for all players in the tournament (finding them from matches to be safe)
    const playerIds = new Set();
    tournament.rounds.forEach(r => r.matches.forEach(m => {
        m.team1.forEach(id => playerIds.add(id));
        m.team2.forEach(id => playerIds.add(id));
    }));

    playerIds.forEach(id => {
        const player = state.players.find(p => p.id === id);
        if (player) {
            stats[id] = { 
                id: id,
                name: player.name, 
                played: 0, 
                wins: 0,
                draws: 0, 
                losses: 0,
                gamesWon: 0, 
                gamesLost: 0,
                diff: 0 
            };
        }
    });

    // Process matches
    tournament.rounds.forEach(r => {
        r.matches.forEach(m => {
            if (m.played) {
                const update = (ids, won, gWon, gLost, isDraw) => {
                    ids.forEach(id => {
                        if (stats[id]) {
                            stats[id].played++;
                            if (won) stats[id].wins++;
                            else if (isDraw) stats[id].draws++;
                            else stats[id].losses++;
                            
                            stats[id].gamesWon += gWon;
                            stats[id].gamesLost += gLost;
                            stats[id].diff = stats[id].gamesWon - stats[id].gamesLost;
                        }
                    });
                };

                if (m.score1 > m.score2) {
                    update(m.team1, true, m.score1, m.score2, false);
                    update(m.team2, false, m.score2, m.score1, false);
                } else if (m.score2 > m.score1) {
                    update(m.team1, false, m.score1, m.score2, false);
                    update(m.team2, true, m.score2, m.score1, false);
                } else {
                    // Draw
                    update(m.team1, false, m.score1, m.score2, true);
                    update(m.team2, false, m.score2, m.score1, true);
                }
            }
        });
    });

    // Convert to array and sort
    const ranking = Object.values(stats).sort((a, b) => {
        const ap = (a.wins * 3) + (a.draws * 1);
        const bp = (b.wins * 3) + (b.draws * 1);
        if (bp !== ap) return bp - ap;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.gamesWon - a.gamesWon;
    });

    // Render Table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.fontSize = '0.85rem'; // Smaller font for compactness
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 30px; text-align: center; padding: 4px;">#</th>
                <th style="text-align: left; padding: 4px;">Jogador</th>
                <th style="width: 40px; text-align: center; padding: 4px;">Pts</th>
                <th style="width: 30px; text-align: center; padding: 4px;">V</th>
                <th style="width: 30px; text-align: center; padding: 4px;">E</th>
                <th style="width: 30px; text-align: center; padding: 4px;">D</th>
                <th style="width: 50px; text-align: center; padding: 4px;">Dif</th>
            </tr>
        </thead>
        <tbody>
            ${ranking.map((p, i) => `
                <tr>
                    <td style="text-align: center; padding: 4px;">${i + 1}</td>
                    <td style="font-weight:600; cursor:pointer; padding: 4px;" onclick="navigateTo('player-profile', {id: ${p.id}, returnView: 'tournament-view', returnParams: {id: '${tournament.id}', tab: 'ranking'}})">${p.name}</td>
                    <td style="text-align: center; font-weight:bold; padding: 4px;">${(p.wins * 3) + (p.draws * 1)}</td>
                    <td style="text-align: center; padding: 4px;">${p.wins}</td>
                    <td style="text-align: center; padding: 4px;">${p.draws}</td>
                    <td style="text-align: center; padding: 4px;">${p.losses}</td>
                    <td style="text-align: center; padding: 4px; color:${p.diff > 0 ? 'var(--accent-hover)' : (p.diff < 0 ? '#ef4444' : 'inherit')}">
                        ${p.diff > 0 ? '+' : ''}${p.diff}
                    </td>
                </tr>
            `).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

function getTeamName(team) {
    const p1 = state.players.find(p => p.id === team?.[0])?.name || '';
    const p2 = state.players.find(p => p.id === team?.[1])?.name || '';
    return `${p1} & ${p2}`;
}

function computeFinalPlacements(t) {
    const byPhase = (ph) => {
        const ms = [];
        t.rounds.forEach(r => r.matches.forEach(m => { if (m.phase === ph) ms.push(m); }));
        return ms;
    };
    const winner = (m) => {
        if (!m) return null;
        if (!m.played) return null;
        return m.score1 > m.score2 ? m.team1 : m.score2 > m.score1 ? m.team2 : null;
    };
    const loser = (m) => {
        if (!m) return null;
        if (!m.played) return null;
        return m.score1 > m.score2 ? m.team2 : m.score2 > m.score1 ? m.team1 : null;
    };
    const final = byPhase('final')[0];
    const third = byPhase('third')[0];
    const p56 = byPhase('placement5_6')[0];
    const p78 = byPhase('placement7_8')[0];
    const res = [];
    if (final) {
        const w = winner(final); const l = loser(final);
        if (w) res.push({ pos: 1, team: w });
        if (l) res.push({ pos: 2, team: l });
    }
    if (third) {
        const w = winner(third); const l = loser(third);
        if (w) res.push({ pos: 3, team: w });
        if (l) res.push({ pos: 4, team: l });
    }
    if (p56) {
        const w = winner(p56); const l = loser(p56);
        if (w) res.push({ pos: 5, team: w });
        if (l) res.push({ pos: 6, team: l });
    }
    if (p78) {
        const w = winner(p78); const l = loser(p78);
        if (w) res.push({ pos: 7, team: w });
        if (l) res.push({ pos: 8, team: l });
    }
    return res;
}

function renderCreateTournament(container) {
    if (!isAdmin) {
        navigateTo('login');
        return;
    }

    const h1 = document.createElement('h1');
    h1.textContent = 'Criar Torneio';
    container.appendChild(h1);

    const form = document.createElement('div');
    form.className = 'card';

    // Ocultamos contadores de jogadores/campos/rondas; usamos seleção e defaults por formato

    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Nome do Torneio (Opcional)';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Ex: Torneio de Verão';

    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Tipo de Torneio';
    const typeSelect = document.createElement('select');
    const optChoose = document.createElement('option');
    optChoose.value = '';
    optChoose.textContent = 'Escolha o tipo';
    const optAmericano = document.createElement('option');
    optAmericano.value = 'americano';
    optAmericano.textContent = 'Americano (duplas aleatórias)';
    const optGrupos = document.createElement('option');
    optGrupos.value = 'grupos';
    optGrupos.textContent = 'Duplas Fixas (Grupos, 16 jogadores)';
    const optLiga = document.createElement('option');
    optLiga.value = 'liga';
    optLiga.textContent = 'Liga (Duplas Fixas, 20 jogadores)';
    const optLiga12 = document.createElement('option');
    optLiga12.value = 'liga12';
    optLiga12.textContent = 'Liga 6 duplas fixas (12 jogadores)';
    const optSwiss20 = document.createElement('option');
    optSwiss20.value = 'swiss20';
    optSwiss20.textContent = '20 Jogadores Swiss Format';
    typeSelect.appendChild(optChoose);
    typeSelect.appendChild(optAmericano);
    typeSelect.appendChild(optGrupos);
    typeSelect.appendChild(optLiga);
    typeSelect.appendChild(optLiga12);
    typeSelect.appendChild(optSwiss20);
    typeSelect.value = '';

    // Container for dynamic selection inputs
    const selectionContainer = document.createElement('div');
    selectionContainer.style.marginTop = '20px';

    const errorMsg = document.createElement('div');
    errorMsg.style.color = '#ef4444';
    errorMsg.style.fontSize = '0.9rem';
    errorMsg.style.marginTop = '10px';
    errorMsg.style.minHeight = '1.2rem';

    let playerOrder = new Array(20).fill(null);
    let userPairs = [];

    // Helper to create player dropdown
    const createPlayerSelect = (selectedValue, onChange, indexKey) => {
        const select = document.createElement('select');
        select.style.width = '100%';
        select.style.marginBottom = '0';
        
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = 'Selecionar jogador...';
        select.appendChild(defaultOpt);

        // Sort players alphabetically
        const sortedPlayers = [...state.players].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedPlayers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            if (String(p.id) === String(selectedValue)) {
                opt.selected = true;
            }
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            const newVal = e.target.value ? parseInt(e.target.value) : null;
            onChange(newVal);
            updateSelectOptionsAvailability(); // Update all selects when one changes
        };
        
        // Initial check on focus to ensure state is fresh
        select.onfocus = () => {
             updateSelectOptionsAvailability();
        };

        select.dataset.key = indexKey;
        return select;
    };

    // New function to handle disabling options
    const updateSelectOptionsAvailability = () => {
        const allSelects = selectionContainer.querySelectorAll('select');
        const selectedValues = new Set();
        
        // First pass: collect all currently selected values
        allSelects.forEach(sel => {
            if (sel.value) {
                selectedValues.add(parseInt(sel.value));
            }
        });

        // Second pass: update options in each select
        allSelects.forEach(sel => {
            const currentValue = sel.value ? parseInt(sel.value) : null;
            
            Array.from(sel.options).forEach(opt => {
                if (!opt.value) return; // Skip placeholder
                
                const optValue = parseInt(opt.value);
                const originalText = opt.textContent.replace(' (Selecionado)', ''); // Clean text first

                // Disable if selected elsewhere AND not the current value of this select
                if (selectedValues.has(optValue) && optValue !== currentValue) {
                    opt.disabled = true;
                    opt.textContent = `${originalText} (Selecionado)`;
                    opt.style.color = '#9ca3af'; // Grey out
                } else {
                    opt.disabled = false;
                    opt.textContent = originalText;
                    opt.style.color = ''; // Reset color
                }
            });
        });
    };

    const validateAndHighlight = () => {
        const allSelects = selectionContainer.querySelectorAll('select');
        const selectedIds = new Map(); // id -> count
        const positions = new Map(); // id -> list of select elements

        allSelects.forEach(sel => {
            sel.style.borderColor = 'var(--border)';
            if (sel.value) {
                const id = parseInt(sel.value);
                selectedIds.set(id, (selectedIds.get(id) || 0) + 1);
                if (!positions.has(id)) positions.set(id, []);
                positions.get(id).push(sel);
            }
        });

        let hasDuplicates = false;
        let hasEmpty = false;

        allSelects.forEach(sel => {
            if (!sel.value) hasEmpty = true;
            else {
                const id = parseInt(sel.value);
                if (selectedIds.get(id) > 1) {
                    sel.style.borderColor = '#ef4444';
                    hasDuplicates = true;
                }
            }
        });

        if (hasDuplicates) {
            errorMsg.textContent = 'Erro: Jogadores repetidos selecionados.';
            return false;
        }
        
        const required = typeSelect.value === 'liga' || typeSelect.value === 'americano' || typeSelect.value === 'swiss20' ? 20 : (typeSelect.value === 'liga12' ? 12 : 16);
        const currentCount = Array.from(selectedIds.keys()).length;
        
        if (currentCount !== required) {
            errorMsg.textContent = `Selecione todos os ${required} jogadores. (${currentCount}/${required})`;
            return false;
        }

        errorMsg.textContent = '';
        return true;
    };

    const renderSelectors = () => {
        selectionContainer.innerHTML = '';
        errorMsg.textContent = '';
        
        if (!typeSelect.value) return;

        if (typeSelect.value === 'americano' || typeSelect.value === 'swiss20') {
            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
            grid.style.gap = '15px';

            for (let i = 0; i < 20; i++) {
                const wrapper = document.createElement('div');
                const label = document.createElement('label');
                label.textContent = `Posição ${i + 1}`;
                label.style.fontSize = '0.8rem';
                label.style.marginBottom = '4px';
                
                const select = createPlayerSelect(playerOrder[i], (val) => {
                    playerOrder[i] = val;
                    updateGenerateBtn();
                }, `p-${i}`);

                wrapper.appendChild(label);
                wrapper.appendChild(select);
                grid.appendChild(wrapper);
            }
            selectionContainer.appendChild(grid);
        } else {
            // Grupos or Liga
            let numPairs = 8;
            if (typeSelect.value === 'liga') numPairs = 10;
            if (typeSelect.value === 'liga12') numPairs = 6;
            
            userPairs = userPairs.length === numPairs ? userPairs : Array(numPairs).fill(null).map(() => [null, null]);

            const grid = document.createElement('div');
            grid.style.display = 'grid';
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
            grid.style.gap = '20px';

            for (let i = 0; i < numPairs; i++) {
                const card = document.createElement('div');
                card.className = 'card';
                card.style.marginBottom = '0';
                card.style.padding = '1rem';
                
                const title = document.createElement('h4');
                title.textContent = `Dupla ${i + 1}`;
                title.style.margin = '0 0 10px 0';
                title.style.fontSize = '0.9rem';
                
                const p1Wrapper = document.createElement('div');
                p1Wrapper.style.marginBottom = '8px';
                const p1Select = createPlayerSelect(userPairs[i][0], (val) => {
                    userPairs[i][0] = val;
                    updateGenerateBtn();
                }, `d-${i}-0`);
                p1Wrapper.appendChild(p1Select);

                const p2Wrapper = document.createElement('div');
                const p2Select = createPlayerSelect(userPairs[i][1], (val) => {
                    userPairs[i][1] = val;
                    updateGenerateBtn();
                }, `d-${i}-1`);
                p2Wrapper.appendChild(p2Select);

                card.appendChild(title);
                card.appendChild(p1Wrapper);
                card.appendChild(p2Wrapper);
                grid.appendChild(card);
            }
            selectionContainer.appendChild(grid);
        }
        
        // Initial update of availability after rendering
        updateSelectOptionsAvailability();
    };

    typeSelect.onchange = () => {
        playerOrder = new Array(20).fill(null);
        userPairs = [];
        renderSelectors();
        updateGenerateBtn();
    };

    const generateBtn = document.createElement('button');
    generateBtn.textContent = 'Gerar Jogos Automaticamente';
    generateBtn.className = 'primary';
    generateBtn.style.marginTop = '20px';
    generateBtn.disabled = true;

    const updateGenerateBtn = () => {
        const isValid = validateAndHighlight();
        generateBtn.disabled = !isValid;
    };

    generateBtn.onclick = () => {
        let ids;
        if (typeSelect.value === 'americano' || typeSelect.value === 'swiss20') {
            ids = playerOrder;
        } else {
            // For groups/liga, ids are derived from pairs
            ids = userPairs.flat();
        }
        
        let defaultCourts = 4;
        if (typeSelect.value === 'liga' || typeSelect.value === 'americano' || typeSelect.value === 'swiss20') defaultCourts = 5;
        if (typeSelect.value === 'liga12') defaultCourts = 3;

        const defaultRounds = 5;
        
        createTournament(
            nameInput.value.trim(),
            ids.length,
            defaultCourts,
            defaultRounds,
            typeSelect.value,
            ids,
            (typeSelect.value.startsWith('liga') || typeSelect.value === 'grupos') ? userPairs : undefined
        );
    };

    form.appendChild(nameLabel);
    form.appendChild(nameInput);
    form.appendChild(typeLabel);
    form.appendChild(typeSelect);
    form.appendChild(selectionContainer);
    form.appendChild(errorMsg);
    form.appendChild(generateBtn);
    container.appendChild(form);
    updateTypeAvailability = () => {}; // Dummy for safety if called elsewhere

}

// 5. Detalhe do Jogo
function renderGameDetail(container) {
    const { tournamentId, roundIndex, matchIndex } = state.viewParams;
    const tournament = state.tournaments.find(t => t.id === tournamentId);
    const match = tournament.rounds[roundIndex].matches[matchIndex];

    const h1 = document.createElement('h1');
    h1.textContent = 'Detalhe do Jogo';
    container.appendChild(h1);

    const backBtn = document.createElement('button');
    backBtn.textContent = '← Voltar';
    backBtn.className = 'secondary';
    backBtn.style.marginBottom = '20px';
    backBtn.onclick = () => navigateTo('tournament-view', { id: tournamentId });
    container.appendChild(backBtn);

    const card = document.createElement('div');
    card.className = 'card';

    const p1 = state.players.find(p => p.id === match.team1[0])?.name;
    const p2 = state.players.find(p => p.id === match.team1[1])?.name;
    const p3 = state.players.find(p => p.id === match.team2[0])?.name;
    const p4 = state.players.find(p => p.id === match.team2[1])?.name;

    card.innerHTML = `
        <h3>Campo ${match.courtId} - Ronda ${roundIndex + 1}</h3>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <div style="text-align:center; width: 45%;">
                <strong>Equipa 1</strong><br>
                ${p1}<br>${p2}
            </div>
            <div style="font-weight:bold;">VS</div>
            <div style="text-align:center; width: 45%;">
                <strong>Equipa 2</strong><br>
                ${p3}<br>${p4}
            </div>
        </div>
    `;

    const scoreDiv = document.createElement('div');
    scoreDiv.style.display = 'flex';
    scoreDiv.style.gap = '20px';
    scoreDiv.style.marginBottom = '20px';

    const score1Input = document.createElement('input');
    score1Input.type = 'number';
    score1Input.placeholder = 'Score E1';
    score1Input.value = match.played ? match.score1 : '';

    const score2Input = document.createElement('input');
    score2Input.type = 'number';
    score2Input.placeholder = 'Score E2';
    score2Input.value = match.played ? match.score2 : '';

    scoreDiv.appendChild(score1Input);
    scoreDiv.appendChild(score2Input);
    card.appendChild(scoreDiv);

    if (isAdmin) {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Guardar Resultado';
        saveBtn.className = 'primary';
        saveBtn.style.width = '100%';
        saveBtn.onclick = () => {
            const s1 = score1Input.value === '' ? 0 : parseInt(score1Input.value);
            const s2 = score2Input.value === '' ? 0 : parseInt(score2Input.value);
            saveMatchResult(tournamentId, roundIndex, matchIndex, s1, s2);
            navigateTo('tournament-view', { id: tournamentId });
        };
        card.appendChild(saveBtn);
    } else {
        score1Input.disabled = true;
        score2Input.disabled = true;
        
        const msg = document.createElement('div');
        msg.textContent = 'Apenas administradores podem inserir resultados.';
        msg.style.color = 'var(--text-muted)';
        msg.style.textAlign = 'center';
        msg.style.marginTop = '10px';
        card.appendChild(msg);
    }

    container.appendChild(card);
}

function renderRanking(container) {
    const h1 = document.createElement('h1');
    h1.textContent = 'Ranking';
    container.appendChild(h1);

    // Default points table (can be used for others if needed, or fallback)
    const pointsTableDefault = [150,150,120,120,100,100,80,80,60,60,50,50,40,40,30,30,20,20,10,10];
    
    // Specific points table for Americano 20 Players
    const pointsTableAmericano20 = [250, 220, 200, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    
    // Points table for Liga 12 (6 pairs)
    const pointsTableLiga12 = [200, 200, 160, 160, 130, 130, 110, 110, 90, 90, 70, 70];

    const totals = {};
    state.players.forEach(p => {
        totals[p.id] = { id: p.id, name: p.name, points: 0, tournaments: 0, wins: p.wins, losses: p.losses, gamesPlayed: p.gamesPlayed };
    });
    
    state.tournaments.forEach(t => {
        if (t.status !== 'Finalizado') return;
        
        const playerIds = new Set();
        t.rounds.forEach(r => r.matches.forEach(m => {
            m.team1.forEach(id => playerIds.add(id));
            m.team2.forEach(id => playerIds.add(id));
        }));
        
        const stats = {};
        playerIds.forEach(id => {
            const player = state.players.find(p => p.id === id);
            if (player) {
                stats[id] = { id, name: player.name, played: 0, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, diff: 0 };
            }
        });
        
        t.rounds.forEach(r => {
            r.matches.forEach(m => {
                if (m.played) {
                    const update = (ids, won, gWon, gLost) => {
                        ids.forEach(id => {
                            if (stats[id]) {
                                stats[id].played++;
                                if (won) stats[id].wins++;
                                else if (gWon < gLost) stats[id].losses++;
                                stats[id].gamesWon += gWon;
                                stats[id].gamesLost += gLost;
                                stats[id].diff = stats[id].gamesWon - stats[id].gamesLost;
                            }
                        });
                    };
                    if (m.score1 > m.score2) {
                        update(m.team1, true, m.score1, m.score2);
                        update(m.team2, false, m.score2, m.score1);
                    } else if (m.score2 > m.score1) {
                        update(m.team1, false, m.score1, m.score2);
                        update(m.team2, true, m.score2, m.score1);
                    } else {
                        update(m.team1, false, m.score1, m.score2);
                        update(m.team2, false, m.score2, m.score1);
                    }
                }
            });
        });
        
        const arr = Object.values(stats).sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.gamesWon - a.gamesWon;
        });
        
        // Determine which points table to use
        let currentPointsTable = pointsTableDefault;
        if (t.type === 'americano' && playerIds.size === 20) {
            currentPointsTable = pointsTableAmericano20;
        } else if (t.type === 'americano') {
             // Fallback for americano with different player count if any, or use same
             currentPointsTable = pointsTableAmericano20; 
        } else if (t.type === 'liga' && playerIds.size === 12) {
             currentPointsTable = pointsTableLiga12;
        }
        // Future: Add conditions for 'grupos' or 'liga' if they have specific tables

        arr.forEach((p, i) => {
            const pts = i < currentPointsTable.length ? currentPointsTable[i] : 0;
            if (totals[p.id]) {
                totals[p.id].points += pts;
                totals[p.id].tournaments += 1;
            }
        });
    });
    const ranking = Object.values(totals).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        return b.gamesPlayed - a.gamesPlayed;
    });

    const table = document.createElement('table');
    table.style.fontSize = '0.85rem';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 30px; text-align: center; padding: 4px;">#</th>
                <th style="text-align: left; padding: 4px;">Jogador</th>
                <th style="width: 40px; text-align: center; padding: 4px;">Pts</th>
                <th style="width: 30px; text-align: center; padding: 4px;">T</th>
                <th style="width: 30px; text-align: center; padding: 4px;">V</th>
                <th style="width: 30px; text-align: center; padding: 4px;">E</th>
                <th style="width: 30px; text-align: center; padding: 4px;">D</th>
            </tr>
        </thead>
        <tbody>
            ${ranking.map((p, i) => {
                const highlightClass = i < 3 ? 'rank-highlight' : '';
                const medalClass = i === 0 ? 'medal medal-gold' : i === 1 ? 'medal medal-silver' : i === 2 ? 'medal medal-bronze' : '';
                const medalHtml = medalClass ? `<span class="${medalClass}">${i + 1}º</span>` : '';
                // Calculate draws dynamically
                const playerDraws = state.tournaments.reduce((acc, t) => {
                     let draws = 0;
                     t.rounds.forEach(r => r.matches.forEach(m => {
                         if (m.played && m.score1 === m.score2 && (m.team1.includes(p.id) || m.team2.includes(p.id))) {
                             draws++;
                         }
                     }));
                     return acc + draws;
                }, 0);

                return `
                    <tr class="${highlightClass}">
                        <td style="text-align: center; padding: 4px;">${i + 1}</td>
                        <td style="font-weight:600; cursor:pointer; padding: 4px;" onclick="navigateTo('player-profile', {id: ${p.id}, returnView: 'ranking'})">${p.name} ${medalHtml}</td>
                        <td style="text-align: center; font-weight:bold; padding: 4px;">${p.points}</td>
                        <td style="text-align: center; padding: 4px;">${p.tournaments}</td>
                        <td style="text-align: center; padding: 4px;">${p.wins}</td>
                        <td style="text-align: center; padding: 4px;">${playerDraws}</td>
                        <td style="text-align: center; padding: 4px;">${p.losses}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    container.appendChild(table);
}

// 6. Player Profile
function renderPlayerProfile(container) {
    const playerId = state.viewParams.id;
    const player = state.players.find(p => p.id === playerId);
    
    if (!player) return navigateTo('ranking');

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '10px';
    header.style.marginBottom = '0.5rem';

    const h1 = document.createElement('h1');
    h1.textContent = player.name;
    h1.style.margin = '0';
    
    const editBtn = document.createElement('button');
    if (isAdmin) {
        editBtn.innerHTML = '✏️';
        editBtn.className = 'secondary';
        editBtn.style.padding = '4px 8px';
        editBtn.style.fontSize = '1rem';
        editBtn.style.border = 'none';
        editBtn.style.background = 'transparent';
        editBtn.style.cursor = 'pointer';
        editBtn.onclick = () => {
            const newName = prompt('Novo nome para o jogador:', player.name);
            if (newName && newName.trim() !== '') {
                player.name = newName.trim();
                saveState();
                render();
            }
        };
    }

    header.appendChild(h1);
    if (isAdmin) header.appendChild(editBtn);
    container.appendChild(header);
    
    const backBtn = document.createElement('button');
    backBtn.textContent = '← Voltar';
    backBtn.className = 'secondary';
    backBtn.style.marginBottom = '20px';
    
    const returnView = state.viewParams.returnView || 'ranking';
    const returnParams = state.viewParams.returnParams || {};

    backBtn.onclick = () => navigateTo(returnView, returnParams);
    container.appendChild(backBtn);

    // Stats Card
    const statsCard = document.createElement('div');
    statsCard.className = 'card';
    
    const winRate = player.gamesPlayed > 0 ? Math.round((player.wins / player.gamesPlayed) * 100) : 0;
    
    // Calculate draws dynamically
    const playerDraws = state.tournaments.reduce((acc, t) => {
         let draws = 0;
         t.rounds.forEach(r => r.matches.forEach(m => {
             if (m.played && m.score1 === m.score2 && (m.team1.includes(player.id) || m.team2.includes(player.id))) {
                 draws++;
             }
         }));
         return acc + draws;
    }, 0);
    
    statsCard.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:20px;">
            <div style="text-align:center">
                <div style="font-size:2rem; font-weight:700; color:var(--primary)">${player.gamesPlayed}</div>
                <div style="color:var(--text-muted)">Jogos</div>
            </div>
            <div style="text-align:center">
                <div style="font-size:2rem; font-weight:700; color:var(--accent)">${winRate}%</div>
                <div style="color:var(--text-muted)">Vitórias</div>
            </div>
            <div style="text-align:center">
                <div style="font-size:1.5rem; font-weight:600; color:#22c55e">${player.wins}</div>
                <div style="color:var(--text-muted)">Vitórias</div>
            </div>
            <div style="text-align:center">
                <div style="font-size:1.5rem; font-weight:600; color:#eab308">${playerDraws}</div>
                <div style="color:var(--text-muted)">Empates</div>
            </div>
            <div style="text-align:center; grid-column: span 2">
                <div style="font-size:1.5rem; font-weight:600; color:#ef4444">${player.losses}</div>
                <div style="color:var(--text-muted)">Derrotas</div>
            </div>
        </div>
    `;
    container.appendChild(statsCard);

    // Recent Tournaments
    const h3 = document.createElement('h3');
    h3.textContent = 'Torneios Recentes';
    h3.style.marginTop = '20px';
    container.appendChild(h3);

    const tournamentList = document.createElement('ul');
    const playerTournaments = state.tournaments.filter(t => {
        return t.rounds.some(r => r.matches.some(m => m.team1.includes(player.id) || m.team2.includes(player.id)));
    }).reverse();

    if (playerTournaments.length === 0) {
        tournamentList.innerHTML = '<li style="color:var(--text-muted)">Sem torneios registados.</li>';
    } else {
        playerTournaments.forEach(t => {
            const li = document.createElement('li');
            li.style.cursor = 'pointer';
            li.onclick = () => navigateTo('tournament-view', { id: t.id });
            
            const statusColor = t.status === 'Finalizado' ? 'var(--text-muted)' : 'var(--accent-hover)';
            
            const displayName = t.name ? t.name : `Torneio #${t.id.slice(-4)}`;
            
            li.innerHTML = `
                <div>
                    <div style="font-weight:600">${displayName}</div>
                    <div style="font-size:0.875rem; color:var(--text-muted)">${t.type === 'americano' ? 'Americano' : (t.type === 'liga' ? 'Liga' : 'Grupos')}</div>
                </div>
                <span style="font-size:0.75rem; background:${statusColor}; color:white; padding:2px 8px; border-radius:99px;">${t.status || 'Em Curso'}</span>
            `;
            tournamentList.appendChild(li);
        });
    }
    container.appendChild(tournamentList);
}

// Logic Functions
function addPlayer(name) {
    const id = state.players.length > 0 ? Math.max(...state.players.map(p => p.id)) + 1 : 1;
    state.players.push({ id, name, gamesPlayed: 0, wins: 0, losses: 0 });
    saveState();
}

function removePlayer(id) {
    state.players = state.players.filter(p => p.id !== id);
    saveState();
}

function createTournament(name, numPlayers, numCourts, numRounds, type, selectedIds, pairs) {
    const tournamentId = Date.now().toString();
    let tournament;
    const selectedPlayers = Array.isArray(selectedIds) && selectedIds.length > 0
        ? selectedIds.map(id => state.players.find(p => p.id === id)).filter(Boolean)
        : state.players.slice(0, numPlayers);
    if (type === 'grupos' && selectedPlayers.length === 16) {
        const validPairs = Array.isArray(pairs) && pairs.length === 8 ? pairs : undefined;
        tournament = validPairs ? createTournamentGrupos(tournamentId, validPairs, numCourts)
                                : createTournamentGrupos(tournamentId, selectedPlayers.map((p, i, arr) => (i % 2 === 0 && i + 1 < arr.length) ? [arr[i].id, arr[i+1].id] : null).filter(Boolean), numCourts);
    } else if (type === 'liga' && selectedPlayers.length === 20) {
        const validPairs = Array.isArray(pairs) && pairs.length === 10 ? pairs : undefined;
        tournament = validPairs ? createTournamentLiga20(tournamentId, validPairs, numCourts)
                                : createTournamentLiga20(tournamentId, selectedPlayers.map((p, i, arr) => (i % 2 === 0 && i + 1 < arr.length) ? [arr[i].id, arr[i+1].id] : null).filter(Boolean), numCourts);
    } else if (type === 'liga12' && selectedPlayers.length === 12) {
        const validPairs = Array.isArray(pairs) && pairs.length === 6 ? pairs : undefined;
        tournament = validPairs ? createTournamentLiga12(tournamentId, validPairs, numCourts)
                                : createTournamentLiga12(tournamentId, selectedPlayers.map((p, i, arr) => (i % 2 === 0 && i + 1 < arr.length) ? [arr[i].id, arr[i+1].id] : null).filter(Boolean), numCourts);
    } else if (type === 'swiss20' && selectedPlayers.length === 20) {
        tournament = createTournamentSwiss20(tournamentId, selectedPlayers, numCourts);
    } else {
        tournament = createTournamentAmericano(tournamentId, selectedPlayers, numCourts, numRounds);
    }

    tournament.name = name;
    state.tournaments.push(tournament);
    saveState();

    navigateTo('tournament-view', { id: tournamentId });
}

function createTournamentAmericano(tournamentId, players, numCourts, numRounds) {
    if (players.length === 20) {
        const rounds20 = buildAmericano20Rounds(players);
        return { id: tournamentId, status: 'Em Curso', rounds: rounds20, type: 'americano' };
    } else {
        const rounds = [];
        const availablePlayers = players.slice();
        for (let r = 0; r < numRounds; r++) {
            const matches = [];
            const shuffled = [...availablePlayers].sort(() => 0.5 - Math.random());
            for (let c = 0; c < numCourts; c++) {
                const startIndex = c * 4;
                if (startIndex + 3 < shuffled.length) {
                    matches.push({
                        courtId: c + 1,
                        team1: [shuffled[startIndex].id, shuffled[startIndex+1].id],
                        team2: [shuffled[startIndex+2].id, shuffled[startIndex+3].id],
                        score1: 0,
                        score2: 0,
                        played: false
                    });
                }
            }
            rounds.push({ matches });
        }
        return { id: tournamentId, status: 'Em Curso', rounds, type: 'americano' };
    }
}

function createTournamentLiga20(tournamentId, pairs, numCourts) {
    const teams = pairs.map(p => [p[0], p[1]]);
    const rounds = buildLiga20ProvidedRounds(teams);
    return { id: tournamentId, status: 'Em Curso', rounds, type: 'liga', teams };
}

function createTournamentLiga12(tournamentId, pairs, numCourts) {
    const teams = pairs.map(p => [p[0], p[1]]);
    const rounds = buildLiga12ProvidedRounds(teams);
    return { id: tournamentId, status: 'Em Curso', rounds, type: 'liga', teams };
}

function createTournamentSwiss20(tournamentId, players, numCourts) {
    const rounds = [];
    
    // Helper to check if pair exists in history
    const pairExists = (p1, p2, historyRounds) => {
        return historyRounds.some(r => r.matches.some(m => {
            const t1 = m.team1;
            const t2 = m.team2;
            const check = (team) => (team.includes(p1) && team.includes(p2));
            return check(t1) || check(t2);
        }));
    };

    // R1: Random
    const r1Players = [...players].sort(() => 0.5 - Math.random());
    const r1Matches = [];
    for (let c = 0; c < numCourts; c++) {
        const i = c * 4;
        r1Matches.push({
            courtId: c + 1,
            team1: [r1Players[i].id, r1Players[i+1].id],
            team2: [r1Players[i+2].id, r1Players[i+3].id],
            score1: 0, score2: 0, played: false, phase: 'swiss_r1'
        });
    }
    rounds.push({ matches: r1Matches });

    // R2: Random but no repeat partners
    let r2Matches = [];
    let attempts = 0;
    while (attempts < 1000) {
        const r2Players = [...players].sort(() => 0.5 - Math.random());
        let valid = true;
        const currentMatches = [];
        
        for (let c = 0; c < numCourts; c++) {
            const i = c * 4;
            const p1 = r2Players[i].id;
            const p2 = r2Players[i+1].id;
            const p3 = r2Players[i+2].id;
            const p4 = r2Players[i+3].id;
            
            if (pairExists(p1, p2, rounds) || pairExists(p3, p4, rounds)) {
                valid = false;
                break;
            }
            currentMatches.push({
                courtId: c + 1,
                team1: [p1, p2],
                team2: [p3, p4],
                score1: 0, score2: 0, played: false, phase: 'swiss_r2'
            });
        }
        
        if (valid) {
            r2Matches = currentMatches;
            break;
        }
        attempts++;
    }
    
    if (r2Matches.length === 0) {
        // Fallback if super unlucky, just take random
        const r2Players = [...players].sort(() => 0.5 - Math.random());
        for (let c = 0; c < numCourts; c++) {
            const i = c * 4;
            r2Matches.push({
                courtId: c + 1,
                team1: [r2Players[i].id, r2Players[i+1].id],
                team2: [r2Players[i+2].id, r2Players[i+3].id],
                score1: 0, score2: 0, played: false, phase: 'swiss_r2'
            });
        }
    }
    
    // Optimize court assignment for R2 as well (even though R1 was random, we can try to switch it up)
    const optimizedR2 = distributeMatchesToCourts(r2Matches, rounds, numCourts);

    // Sort matches by courtId
    optimizedR2.sort((a, b) => a.courtId - b.courtId);

    rounds.push({ matches: optimizedR2 });

    return { id: tournamentId, status: 'Em Curso', rounds, type: 'swiss20', stage: 'r2' };
}

function buildRoundRobinRounds(teams) {
    const n = teams.length;
    const arr = teams.map(t => t.slice());
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
        const matches = [];
        for (let i = 0; i < n / 2; i++) {
            const t1 = arr[i];
            const t2 = arr[n - 1 - i];
            matches.push({ team1: t1, team2: t2, score1: 0, score2: 0, played: false });
        }
        rounds.push(matches);
        const fixed = arr[0];
        const rest = arr.slice(1);
        rest.unshift(rest.pop());
        arr.splice(0, arr.length, fixed, ...rest);
    }
    return rounds;
}

function buildLiga20ProvidedRounds(teams) {
    const pick = (i) => teams[i - 1];
    const mk = (a, b, court) => ({
        courtId: court,
        team1: pick(a),
        team2: pick(b),
        score1: 0,
        score2: 0,
        played: false,
        phase: 'league'
    });
    const R1 = [
        mk(7, 10, 1),
        mk(2, 8, 2),
        mk(9, 6, 3),
        mk(3, 4, 4),
        mk(1, 5, 5),
    ];
    const R2 = [
        mk(6, 2, 1),
        mk(10, 4, 2),
        mk(8, 1, 3),
        mk(5, 9, 4),
        mk(3, 7, 5),
    ];
    const R3 = [
        mk(1, 3, 1),
        mk(7, 6, 2),
        mk(2, 5, 3),
        mk(10, 8, 4),
        mk(4, 9, 5),
    ];
    const R4 = [
        mk(8, 9, 1),
        mk(3, 5, 2),
        mk(7, 4, 3),
        mk(6, 1, 4),
        mk(2, 10, 5),
    ];
    const R5 = [
        mk(5, 4, 1),
        mk(1, 9, 2),
        mk(3, 10, 3),
        mk(7, 2, 4),
        mk(6, 8, 5),
    ];
    return [{ matches: R1 }, { matches: R2 }, { matches: R3 }, { matches: R4 }, { matches: R5 }];
}

function buildLiga12ProvidedRounds(teams) {
    const pick = (i) => teams[i - 1];
    const mk = (a, b, court) => ({
        courtId: court,
        team1: pick(a),
        team2: pick(b),
        score1: 0,
        score2: 0,
        played: false,
        phase: 'league'
    });
    
    // Ronda 1: D1 vs D6 (C1), D2 vs D5 (C2), D3 vs D4 (C3)
    const R1 = [ mk(1, 6, 1), mk(2, 5, 2), mk(3, 4, 3) ];
    
    // Ronda 2: D2 vs D3 (C1), D1 vs D5 (C2), D6 vs D4 (C3)
    const R2 = [ mk(2, 3, 1), mk(1, 5, 2), mk(6, 4, 3) ];
    
    // Ronda 3: D5 vs D3 (C1), D1 vs D4 (C3), D6 vs D2 (C2) -> Swap C2/C3 to match user request if needed, but order in array matters for visual mostly.
    // User request: R3: 5-3(C1), 6-2(C2), 1-4(C3)
    const R3 = [ mk(5, 3, 1), mk(6, 2, 2), mk(1, 4, 3) ];
    
    // Ronda 4: D5 vs D6 (C1), D1 vs D3 (C2), D4 vs D2 (C3)
    const R4 = [ mk(5, 6, 1), mk(1, 3, 2), mk(4, 2, 3) ];
    
    // Ronda 5: D4 vs D5 (C1), D3 vs D6 (C2), D1 vs D2 (C3)
    const R5 = [ mk(4, 5, 1), mk(3, 6, 2), mk(1, 2, 3) ];

    return [{ matches: R1 }, { matches: R2 }, { matches: R3 }, { matches: R4 }, { matches: R5 }];
}
function buildAmericano20Rounds(players) {
    const idx = (n) => players[n - 1]?.id;
    const mk = (a1, a2, b1, b2, court) => ({
        courtId: court,
        team1: [idx(a1), idx(a2)],
        team2: [idx(b1), idx(b2)],
        score1: 0,
        score2: 0,
        played: false,
        phase: 'group'
    });
    const R1 = [
        mk(6,8,10,12,1),
        mk(2,3,4,5,2),
        mk(9,17,15,18,3),
        mk(13,16,1,7,4),
        mk(11,14,20,19,5),
    ];
    const R2 = [
        mk(14,19,16,18,1),
        mk(7,12,11,20,2),
        mk(1,8,4,9,3),
        mk(17,15,6,5,4),
        mk(10,2,13,3,5),
    ];
    const R3 = [
        mk(5,13,8,11,1),
        mk(4,7,17,19,2),
        mk(1,3,6,20,3),
        mk(10,14,9,2,4),
        mk(12,18,15,16,5),
    ];
    const R4 = [
        mk(1,2,11,15,1),
        mk(3,5,7,14,2),
        mk(10,13,16,19,3),
        mk(18,4,20,12,4),
        mk(8,9,17,6,5),
    ];
    const R5 = [
        mk(2,13,6,18,1),
        mk(9,15,16,20,2),
        mk(10,17,12,14,3),
        mk(8,3,11,19,4),
        mk(1,4,7,5,5),
    ];
    return [{ matches: R1 }, { matches: R2 }, { matches: R3 }, { matches: R4 }, { matches: R5 }];
}
function createTournamentGrupos(tournamentId, pairs, numCourts) {
    const groupA = pairs.slice(0, 4);
    const groupB = pairs.slice(4, 8);
    const mkMatch = (t1, t2, g) => ({ courtId: 0, team1: t1, team2: t2, score1: 0, score2: 0, played: false, phase: 'group', group: g });
    const fixtures4 = [[[0,3],[1,2]], [[0,2],[3,1]], [[0,1],[2,3]]];
    const allMatches = [];
    fixtures4.forEach(fixtures => {
        fixtures.forEach(([a,b]) => allMatches.push(mkMatch(groupA[a], groupA[b], 'A')));
        fixtures.forEach(([a,b]) => allMatches.push(mkMatch(groupB[a], groupB[b], 'B')));
    });
    const scheduledRounds = scheduleMatches(allMatches, numCourts);
    const t = { id: tournamentId, status: 'Em Curso', rounds: scheduledRounds, type: 'grupos', groups: { A: groupA, B: groupB }, stage: 'groups' };
    return t;
}

function scheduleMatches(matches, numCourts) {
    const rounds = [];
    let buffer = [];
    let courtCounter = 1;
    matches.forEach(m => {
        if (buffer.length === numCourts) {
            rounds.push({ matches: buffer });
            buffer = [];
            courtCounter = 1;
        }
        m.courtId = courtCounter;
        buffer.push(m);
        courtCounter += 1;
    });
    if (buffer.length > 0) rounds.push({ matches: buffer });
    return rounds;
}



function saveMatchResult(tournamentId, roundIndex, matchIndex, s1, s2) {
    const tournament = state.tournaments.find(t => t.id === tournamentId);
    const match = tournament.rounds[roundIndex].matches[matchIndex];
    
    if (match.played) {
        updatePlayerStats(match.team1, match.team2, match.score1, match.score2, -1);
    }

    match.score1 = s1;
    match.score2 = s2;
    match.played = true;

    updatePlayerStats(match.team1, match.team2, s1, s2, 1);
    const allFinished = tournament.rounds.every(r => r.matches.every(m => m.played));
    if (allFinished) {
        tournament.status = 'Finalizado';
    } else {
        tournament.status = 'Em Curso';
    }
    if (tournament.type === 'grupos') {
        checkAdvanceStage(tournamentId);
    } else if (tournament.type === 'swiss20') {
        checkAdvanceSwissRound(tournamentId);
    }
    
    saveState();
}

function checkAdvanceStage(tournamentId) {
    const t = state.tournaments.find(x => x.id === tournamentId);
    const phaseDone = (ph) => {
        const ms = [];
        t.rounds.forEach(r => r.matches.forEach(m => { if (m.phase === ph) ms.push(m); }));
        if (ms.length === 0) return false;
        return ms.every(m => m.played);
    };
    if (t.stage === 'groups' && phaseDone('group')) {
        const rankings = computeGroupRankings(t);
        const a = rankings['A'];
        const b = rankings['B'];
        // Semis: 1st A vs 2nd B (Court 2), 1st B vs 2nd A (Court 3)
        const semis = [
            { courtId: 2, team1: a[0], team2: b[1], score1: 0, score2: 0, played: false, phase: 'semi' },
            { courtId: 3, team1: b[0], team2: a[1], score1: 0, score2: 0, played: false, phase: 'semi' }
        ];
        t.rounds.push({ matches: semis });
        
        // Losers Semis (5-8): 3rd A vs 4th B (Court 1), 3rd B vs 4th A (Court 5)
        const losersSemis = [
            { courtId: 1, team1: a[2], team2: b[3], score1: 0, score2: 0, played: false, phase: 'placement5_8_r1' },
            { courtId: 5, team1: b[2], team2: a[3], score1: 0, score2: 0, played: false, phase: 'placement5_8_r1' }
        ];
        t.rounds.push({ matches: losersSemis });
        t.stage = 'semis';
        saveState();
        return;
    }
    if (t.stage === 'semis' && phaseDone('semi')) {
        const sMatches = [];
        t.rounds.forEach(r => r.matches.forEach(m => { if (m.phase === 'semi') sMatches.push(m); }));
        const winners = sMatches.map(m => (m.score1 > m.score2 ? m.team1 : m.team2));
        const losers = sMatches.map(m => (m.score1 > m.score2 ? m.team2 : m.team1));
        
        // Final: Winners of Semis (Court 3)
        const final = [{ courtId: 3, team1: winners[0], team2: winners[1], score1: 0, score2: 0, played: false, phase: 'final' }];
        // 3rd/4th: Losers of Semis (Court 2)
        const third = [{ courtId: 2, team1: losers[0], team2: losers[1], score1: 0, score2: 0, played: false, phase: 'third' }];
        
        t.rounds.push({ matches: final });
        t.rounds.push({ matches: third });
        t.stage = 'finals';
        saveState();
        return;
    }
    if (phaseDone('placement5_8_r1')) {
        let already = false;
        t.rounds.forEach(r => r.matches.forEach(m => { if (m.phase === 'placement5_6' || m.phase === 'placement7_8') already = true; }));
        if (!already) {
            const pMatches = [];
            t.rounds.forEach(r => r.matches.forEach(m => { if (m.phase === 'placement5_8_r1') pMatches.push(m); }));
            const winners = pMatches.map(m => (m.score1 > m.score2 ? m.team1 : m.team2));
            const losers = pMatches.map(m => (m.score1 > m.score2 ? m.team2 : m.team1));
            
            // 5th/6th: Winners of Losers Semis (Court 1)
            const p56 = [{ courtId: 1, team1: winners[0], team2: winners[1], score1: 0, score2: 0, played: false, phase: 'placement5_6' }];
            // 7th/8th: Losers of Losers Semis (Court 4)
            const p78 = [{ courtId: 4, team1: losers[0], team2: losers[1], score1: 0, score2: 0, played: false, phase: 'placement7_8' }];
            
            t.rounds.push({ matches: p56 });
            t.rounds.push({ matches: p78 });
            saveState();
            return;
        }
    }
}

function distributeMatchesToCourts(matches, previousRounds, numCourts) {
    const courts = Array.from({length: numCourts}, (_, i) => i + 1);
    
    // Build player court history
    const playerCourtCounts = {}; // id -> { courtId -> count }
    previousRounds.forEach(r => {
        r.matches.forEach(m => {
            const c = m.courtId;
            [...m.team1, ...m.team2].forEach(pid => {
                if (!playerCourtCounts[pid]) playerCourtCounts[pid] = {};
                playerCourtCounts[pid][c] = (playerCourtCounts[pid][c] || 0) + 1;
            });
        });
    });

    const getCost = (match, courtId) => {
        let cost = 0;
        [...match.team1, ...match.team2].forEach(pid => {
            const history = playerCourtCounts[pid];
            if (history && history[courtId]) {
                // Cost function: exponential to punish repeated courts heavily
                // 1 prev use = 10, 2 prev uses = 100, etc.
                cost += Math.pow(10, history[courtId]); 

                // Extra penalty for Court 4 and 5 if used more than once (meaning history >= 1)
                // User wants max 1 use of Court 4/5.
                if ((courtId === 4 || courtId === 5) && history[courtId] >= 1) {
                    cost += 1000000; // Massive penalty (1M) to avoid 2nd use of C4/C5
                }
            }
        });
        return cost;
    };

    // Permutations of courts
    const permute = (arr) => {
        if (arr.length === 0) return [[]];
        const first = arr[0];
        const rest = arr.slice(1);
        const permsWithoutFirst = permute(rest);
        const allPerms = [];
        permsWithoutFirst.forEach(perm => {
            for (let i = 0; i <= perm.length; i++) {
                const withFirst = [...perm.slice(0, i), first, ...perm.slice(i)];
                allPerms.push(withFirst);
            }
        });
        return allPerms;
    };

    const courtPermutations = permute(courts); // For 5 courts, 120 perms.

    let bestPermutation = null;
    let minCost = Infinity;

    courtPermutations.forEach(perm => {
        let currentCost = 0;
        matches.forEach((m, i) => {
            if (i < perm.length) {
                currentCost += getCost(m, perm[i]);
            }
        });

        if (currentCost < minCost) {
            minCost = currentCost;
            bestPermutation = perm;
        }
    });

    // Assign
    matches.forEach((m, i) => {
        if (bestPermutation && i < bestPermutation.length) {
            m.courtId = bestPermutation[i];
        } else {
             m.courtId = i + 1; // Fallback
        }
    });
    
    return matches;
}

function checkAdvanceSwissRound(tournamentId) {
    const t = state.tournaments.find(t => t.id === tournamentId);
    if (!t) return;

    // Check if current round is fully played
    const currentRoundIndex = t.rounds.length - 1;
    const currentRound = t.rounds[currentRoundIndex];
    if (!currentRound.matches.every(m => m.played)) return;

    // If we have played R2 or more (so we are moving to R3, R4, R5...)
    // AND we haven't reached 5 rounds yet (R1..R5)
    if (t.rounds.length >= 2 && t.rounds.length < 5) {
        // Compute Ranking
        const stats = {};
        // Initialize
        const allPlayerIds = new Set();
        t.rounds.forEach(r => r.matches.forEach(m => {
             m.team1.forEach(id => allPlayerIds.add(id));
             m.team2.forEach(id => allPlayerIds.add(id));
        }));
        
        allPlayerIds.forEach(id => {
            stats[id] = { id, wins: 0, diff: 0, gw: 0, gl: 0 };
        });

        t.rounds.forEach(r => r.matches.forEach(m => {
            if (!m.played) return;
            const update = (ids, won, gw, gl) => {
                ids.forEach(id => {
                    if (stats[id]) {
                        if (won) stats[id].wins++;
                        stats[id].gw += gw;
                        stats[id].gl += gl;
                        stats[id].diff = stats[id].gw - stats[id].gl;
                    }
                });
            };
            if (m.score1 > m.score2) {
                update(m.team1, true, m.score1, m.score2);
                update(m.team2, false, m.score2, m.score1);
            } else if (m.score2 > m.score1) {
                update(m.team1, false, m.score1, m.score2);
                update(m.team2, true, m.score2, m.score1);
            } else {
                // Draw
                // User said: "base number of wins and in case of tie, diff and games won"
                // Usually draws count as 0.5 or 1 pt?
                // Earlier we implemented draw = 1 pt. Let's keep that logic consistent?
                // Or user strictly said "Wins".
                // "tendo por base o número de vitórias" -> implies raw win count.
                // But if we use global logic where draw = 1pt, maybe "Points" is better.
                // Let's stick to "Wins" as requested here.
                update(m.team1, false, m.score1, m.score2);
                update(m.team2, false, m.score2, m.score1);
            }
        }));

        const rankedPlayers = Object.values(stats).sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            if (b.diff !== a.diff) return b.diff - a.diff;
            return b.gw - a.gw;
        });

        // Group by 4 and create matches (1+4 vs 2+3)
        const nextMatches = [];
        for (let i = 0; i < rankedPlayers.length; i += 4) {
            if (i + 3 < rankedPlayers.length) {
                // 1st (i) & 4th (i+3) vs 2nd (i+1) & 3rd (i+2)
                const p1 = rankedPlayers[i].id;   // 1st
                const p2 = rankedPlayers[i+1].id; // 2nd
                const p3 = rankedPlayers[i+2].id; // 3rd
                const p4 = rankedPlayers[i+3].id; // 4th
                
                nextMatches.push({
                    courtId: null, // To be assigned
                    team1: [p1, p4],
                    team2: [p2, p3],
                    score1: 0, score2: 0, played: false, phase: `swiss_r${t.rounds.length + 1}`
                });
            }
        }
        
        // Optimize court assignment to avoid repetition
        const optimizedMatches = distributeMatchesToCourts(nextMatches, t.rounds, 5);
        
        // Sort matches by courtId
        optimizedMatches.sort((a, b) => a.courtId - b.courtId);

        t.rounds.push({ matches: optimizedMatches });
        saveState();
        render(); // Force refresh to show new round
    } else if (t.rounds.length === 5) {
        t.status = 'Finalizado';
        saveState();
        render();
    }
}

function computeGroupRankings(t) {
    const stats = { A: new Map(), B: new Map() };
    const key = (team) => team.slice().sort().join('-');
    t.rounds.forEach(r => r.matches.forEach(m => {
        if (m.phase !== 'group') return;
        const map = stats[m.group];
        const k1 = key(m.team1);
        const k2 = key(m.team2);
        if (!map.has(k1)) map.set(k1, { team: m.team1, wins: 0, gw: 0, gl: 0 });
        if (!map.has(k2)) map.set(k2, { team: m.team2, wins: 0, gw: 0, gl: 0 });
        if (!m.played) return;
        const s1 = map.get(k1);
        const s2 = map.get(k2);
        s1.gw += m.score1;
        s1.gl += m.score2;
        s2.gw += m.score2;
        s2.gl += m.score1;
        if (m.score1 > m.score2) s1.wins += 1;
        else if (m.score2 > m.score1) s2.wins += 1;
    }));
    const rankings = {};
    Object.entries(stats).forEach(([g, map]) => {
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            const bd = (b.gw - b.gl) - (a.gw - a.gl);
            if (bd !== 0) return bd;
            return b.gw - a.gw;
        });
        rankings[g] = arr.map(x => x.team);
    });
    return rankings;
}

function updatePlayerStats(team1Ids, team2Ids, score1, score2, multiplier) {
    // multiplier: 1 for adding stats, -1 for removing (undoing)
    
    const update = (ids, won) => {
        ids.forEach(id => {
            const p = state.players.find(pl => pl.id === id);
            if (p) {
                p.gamesPlayed += 1 * multiplier;
                if (won) p.wins += 1 * multiplier;
                else p.losses += 1 * multiplier;
            }
        });
    };

    if (score1 > score2) {
        update(team1Ids, true);
        update(team2Ids, false);
    } else if (score2 > score1) {
        update(team1Ids, false);
        update(team2Ids, true);
    } else {
        // Draw - counts as game played but maybe no win/loss increment? 
        // User asked for Wins/Losses. Let's assume draws don't increment W/L.
        team1Ids.forEach(id => {
             const p = state.players.find(pl => pl.id === id);
             if(p) p.gamesPlayed += 1 * multiplier;
        });
        team2Ids.forEach(id => {
             const p = state.players.find(pl => pl.id === id);
             if(p) p.gamesPlayed += 1 * multiplier;
        });
    }
}

// Init
console.log('App initializing...');
// Immediate render to ensure UI exists
updateNavbar();

loadState().then(() => {
    // If loadState fetched from server, state is populated.
    // If it failed, it fell back to local storage or mock data.
    if (typeof applyThemeFromStorage === 'function') {
        applyThemeFromStorage();
    }
    
    // Force Dashboard on initial load to avoid stuck state
    state.currentView = 'dashboard';
    
    render();
    startSync();
}).catch(e => {
    console.error('Fatal initialization error:', e);
    // Fallback render if everything fails
    state.currentView = 'dashboard';
    render();
});
