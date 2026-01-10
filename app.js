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
            state.currentView = localView;
            state.viewParams = localParams;
            
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
            state = localState;
            if (!state.currentView) state.currentView = 'dashboard';
        }
    } catch (e) {
        console.error('Error loading local state:', e);
    }

    // Tentar iniciar Firebase
    initFirebase();
    
    // Se não tiver firebase configurado e sem dados locais, inicia mock
    if (!isFirebaseReady && state.players.length === 0) {
        initMockData();
    }
}

function saveState() {
    try {
        state.updatedAt = Date.now();
        
        // Save locally (backup)
        localStorage.setItem('padelAppState', JSON.stringify(state));
        
        // Save to Firebase
        if (isFirebaseReady) {
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
                  // Mostrar erro detalhado no ecrã para debug
                  alert('Erro Firebase Detalhado: ' + e.message + ' | Code: ' + e.code);
                  updateSyncStatus('Erro envio', 'error');
              });
        } else {
            // Se não tiver firebase
            updateSyncStatus('Salvo Localmente', 'default');
        }

    } catch (e) {
        console.error('Error saving state:', e);
        alert('Erro ao guardar dados.');
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
let isAdmin = localStorage.getItem('padelAuth') === 'true';

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
    const authBtn = document.getElementById('auth-btn');
    if (authBtn) {
        authBtn.textContent = isAdmin ? 'Sair' : 'Login';
        // Optional: change style based on state
        if (isAdmin) {
            authBtn.style.backgroundColor = 'var(--primary)';
            authBtn.style.color = 'white';
        } else {
            authBtn.style.backgroundColor = '';
            authBtn.style.color = '';
        }
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
    state.currentView = view;
    state.viewParams = params;
    render();
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
    main.innerHTML = '';

    switch (state.currentView) {
        case 'dashboard':
            renderDashboard(main);
            break;
        case 'players':
            renderPlayers(main);
            break;
        case 'create-tournament':
            renderCreateTournament(main);
            break;
        case 'tournament-view':
            renderTournamentView(main);
            break;
        case 'game-detail':
            renderGameDetail(main);
            break;
        case 'player-profile':
            renderPlayerProfile(main);
            break;
        case 'ranking':
            renderRanking(main);
            break;
        case 'login':
            renderLogin(main);
            break;
        default:
            renderDashboard(main);
    }
}

// Views

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
        const icons = { matches: '📋', ranking: '📈' };
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
            state.viewParams.tab = id;
            render();
        };
        return btn;
    };

    tabsContainer.appendChild(createTab('matches', 'Jogos'));
    tabsContainer.appendChild(createTab('ranking', 'Classificação'));
    container.appendChild(tabsContainer);

    // Content
    if (currentTab === 'matches') {
        renderTournamentMatches(container, tournament);
    } else {
        renderTournamentRanking(container, tournament);
    }
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
        roundContainer.className = 'grid-2';
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
    } else if (tournament.type === 'liga') {
        const map = new Map();
        const key = (team) => team.slice().sort().join('-');
        tournament.rounds.forEach(r => r.matches.forEach(m => {
            if (m.phase !== 'league') return;
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
        const arr = Array.from(map.values());
        arr.sort((a, b) => {
            const ap = a.wins * 3, bp = b.wins * 3;
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
                            <td>${row.wins * 3}</td>
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
                const update = (ids, won, gWon, gLost) => {
                    ids.forEach(id => {
                        if (stats[id]) {
                            stats[id].played++;
                            if (won) stats[id].wins++;
                            else if (gWon < gLost) stats[id].losses++; // Draw check could be added
                            
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
                    // Draw
                    update(m.team1, false, m.score1, m.score2);
                    update(m.team2, false, m.score2, m.score1);
                }
            }
        });
    });

    // Convert to array and sort
    const ranking = Object.values(stats).sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.diff !== a.diff) return b.diff - a.diff;
        return b.gamesWon - a.gamesWon;
    });

    // Render Table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.innerHTML = `
        <thead>
            <tr>
                <th style="width: 60px; text-align: center;">#</th>
                <th style="text-align: left;">Jogador</th>
                <th style="width: 80px; text-align: center;">V</th>
                <th style="width: 80px; text-align: center;">D</th>
                <th style="width: 100px; text-align: center;">Saldo</th>
            </tr>
        </thead>
        <tbody>
            ${ranking.map((p, i) => `
                <tr>
                    <td style="text-align: center;">${i + 1}</td>
                    <td style="font-weight:600; cursor:pointer" onclick="navigateTo('player-profile', {id: ${p.id}, returnView: 'tournament-view', returnParams: {id: '${tournament.id}', tab: 'ranking'}})">${p.name}</td>
                    <td style="text-align: center;">${p.wins}</td>
                    <td style="text-align: center;">${p.losses}</td>
                    <td style="text-align: center; color:${p.diff > 0 ? 'var(--accent-hover)' : (p.diff < 0 ? '#ef4444' : 'inherit')}">
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
    typeSelect.appendChild(optChoose);
    typeSelect.appendChild(optAmericano);
    typeSelect.appendChild(optGrupos);
    typeSelect.appendChild(optLiga);
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
        
        const required = typeSelect.value === 'liga' || typeSelect.value === 'americano' ? 20 : 16;
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

        if (typeSelect.value === 'americano') {
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
            const numPairs = typeSelect.value === 'liga' ? 10 : 8;
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
        if (typeSelect.value === 'americano') {
            ids = playerOrder;
        } else {
            // For groups/liga, ids are derived from pairs
            ids = userPairs.flat();
        }
        
        const defaultCourts = typeSelect.value === 'liga' || typeSelect.value === 'americano' ? 5 : 4; // Default to 4 courts for Groups as requested
        const defaultRounds = 5;
        
        createTournament(
            nameInput.value.trim(),
            ids.length,
            defaultCourts,
            defaultRounds,
            typeSelect.value,
            ids,
            (typeSelect.value === 'liga' || typeSelect.value === 'grupos') ? userPairs : undefined
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
    score1Input.value = match.score1 || 0;

    const score2Input = document.createElement('input');
    score2Input.type = 'number';
    score2Input.placeholder = 'Score E2';
    score2Input.value = match.score2 || 0;

    scoreDiv.appendChild(score1Input);
    scoreDiv.appendChild(score2Input);
    card.appendChild(scoreDiv);

    if (isAdmin) {
        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Guardar Resultado';
        saveBtn.className = 'primary';
        saveBtn.style.width = '100%';
        saveBtn.onclick = () => {
            saveMatchResult(tournamentId, roundIndex, matchIndex, parseInt(score1Input.value), parseInt(score2Input.value));
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
    table.innerHTML = `
        <thead>
            <tr>
                <th>#</th>
                <th>Jogador</th>
                <th>Pontos</th>
                <th>Torneios</th>
                <th>Vitórias</th>
                <th>Derrotas</th>
            </tr>
        </thead>
        <tbody>
            ${ranking.map((p, i) => {
                const highlightClass = i < 3 ? 'rank-highlight' : '';
                const medalClass = i === 0 ? 'medal medal-gold' : i === 1 ? 'medal medal-silver' : i === 2 ? 'medal medal-bronze' : '';
                const medalHtml = medalClass ? `<span class="${medalClass}">${i + 1}º</span>` : '';
                return `
                    <tr class="${highlightClass}">
                        <td>${i + 1}</td>
                        <td style="font-weight:600; cursor:pointer" onclick="navigateTo('player-profile', {id: ${p.id}, returnView: 'ranking'})">${p.name} ${medalHtml}</td>
                        <td>${p.points}</td>
                        <td>${p.tournaments}</td>
                        <td>${p.wins}</td>
                        <td>${p.losses}</td>
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

    const h1 = document.createElement('h1');
    h1.textContent = player.name;
    h1.style.marginBottom = '0.5rem';
    container.appendChild(h1);
    
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
loadState().then(() => {
    // If loadState fetched from server, state is populated.
    // If it failed, it fell back to local storage or mock data.
    if (typeof applyThemeFromStorage === 'function') {
        applyThemeFromStorage();
    }
    render();
    startSync();
});
