document.addEventListener('DOMContentLoaded', () => {
    // Game state variables
    let board = [];
    let currentPlayer = 'X';
    let gameActive = true;
    let gameMode = 'two-player';
    let botDifficulty = 'hard';
    let gridSize = 3;
    let scores = { X: 0, O: 0, draws: 0 };
    let playerNames = { X: 'Player 1', O: 'Player 2' };
    let moveHistory = [];
    let moveStack = []; // For undo functionality
    
    // Winning combinations for different grid sizes
    const winPatterns = {
        3: [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ],
        4: generateWinPatterns(4),
        5: generateWinPatterns(5)
    };
    
    // Function to generate winning patterns for NxN grid
    function generateWinPatterns(size) {
        const patterns = [];
        
        // Rows
        for (let i = 0; i < size; i++) {
            for (let j = 0; j <= size - 3; j++) {
                const row = [];
                for (let k = 0; k < 3; k++) {
                    row.push(i * size + j + k);
                }
                patterns.push(row);
            }
        }
        
        // Columns
        for (let i = 0; i < size; i++) {
            for (let j = 0; j <= size - 3; j++) {
                const col = [];
                for (let k = 0; k < 3; k++) {
                    col.push(i + (j + k) * size);
                }
                patterns.push(col);
            }
        }
        
        // Diagonals (top-left to bottom-right)
        for (let i = 0; i <= size - 3; i++) {
            for (let j = 0; j <= size - 3; j++) {
                const diag1 = [];
                for (let k = 0; k < 3; k++) {
                    diag1.push((i + k) * size + (j + k));
                }
                patterns.push(diag1);
            }
        }
        
        // Diagonals (top-right to bottom-left)
        for (let i = 0; i <= size - 3; i++) {
            for (let j = 2; j < size; j++) {
                const diag2 = [];
                for (let k = 0; k < 3; k++) {
                    diag2.push((i + k) * size + (j - k));
                }
                patterns.push(diag2);
            }
        }
        
        return patterns;
    }
    
    // DOM elements
    const gameBoard = document.getElementById('game-board');
    const currentPlayerElement = document.getElementById('current-player');
    const currentSymbolElement = document.getElementById('current-symbol');
    const player1ScoreElement = document.getElementById('player1-score');
    const player2ScoreElement = document.getElementById('player2-score');
    const drawScoreElement = document.getElementById('draw-score');
    const player1NameElement = document.getElementById('player1-name');
    const player2NameElement = document.getElementById('player2-name');
    const historyList = document.getElementById('history-list');
    const player1Input = document.getElementById('player1-input');
    const player2Input = document.getElementById('player2-input');
    const resultModal = document.getElementById('result-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalButton = document.getElementById('modal-button');
    
    // Initialize the game
    initGame();
    
    function initGame() {
        createBoard();
        
        document.getElementById('restart-btn').addEventListener('click', restartGame);
        document.getElementById('new-game-btn').addEventListener('click', newGame);
        document.getElementById('undo-btn').addEventListener('click', undoMove);
        document.getElementById('two-player-btn').addEventListener('click', () => setGameMode('two-player'));
        document.getElementById('vs-bot-btn').addEventListener('click', () => setGameMode('vs-bot'));
        document.getElementById('easy-btn').addEventListener('click', () => setBotDifficulty('easy'));
        document.getElementById('medium-btn').addEventListener('click', () => setBotDifficulty('medium'));
        document.getElementById('hard-btn').addEventListener('click', () => setBotDifficulty('hard'));
        document.getElementById('size3-btn').addEventListener('click', () => setGridSize(3));
        document.getElementById('size4-btn').addEventListener('click', () => setGridSize(4));
        document.getElementById('size5-btn').addEventListener('click', () => setGridSize(5));
        document.getElementById('clear-history-btn').addEventListener('click', clearHistory);
        modalButton.addEventListener('click', () => {
            resultModal.style.display = 'none';
            // Automatically start a new game after modal is closed
            setTimeout(restartGame, 300);
        });
        
        player1Input.addEventListener('change', updatePlayerNames);
        player2Input.addEventListener('change', updatePlayerNames);
        
        updatePlayerNames();
        updateDisplay();
    }
    
    function createBoard() {
        // Clear the board
        gameBoard.innerHTML = '';
        board = Array(gridSize * gridSize).fill('');
        
        // Set grid template based on size
        gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
        gameBoard.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
        
        // Create cells
        for (let i = 0; i < gridSize * gridSize; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.setAttribute('data-cell-index', i);
            cell.addEventListener('click', handleCellClick);
            gameBoard.appendChild(cell);
        }
        
        // Adjust font size based on grid size
        const cells = document.querySelectorAll('.cell');
        if (gridSize === 3) {
            cells.forEach(cell => cell.style.fontSize = '3rem');
        } else if (gridSize === 4) {
            cells.forEach(cell => cell.style.fontSize = '2.5rem');
        } else {
            cells.forEach(cell => cell.style.fontSize = '2rem');
        }
    }
    
    function handleCellClick(e) {
        const cellIndex = parseInt(e.target.getAttribute('data-cell-index'));
        
        // Check if cell is already taken or game is not active
        if (board[cellIndex] !== '' || !gameActive) return;
        
        // Make move for human player
        makeMove(cellIndex);
        
        // If playing against bot and game is still active, make bot move
        if (gameMode === 'vs-bot' && gameActive) {
            setTimeout(makeBotMove, 600);
        }
    }
    
    function makeMove(cellIndex) {
        // Save move to stack for undo functionality
        moveStack.push({
            board: [...board],
            currentPlayer: currentPlayer,
            gameActive: gameActive
        });
        
        // Update board
        board[cellIndex] = currentPlayer;
        
        // Add animation class
        const cell = document.querySelector(`[data-cell-index="${cellIndex}"]`);
        cell.classList.add(currentPlayer.toLowerCase());
        cell.textContent = currentPlayer;
        
        // Add to history
        const row = Math.floor(cellIndex / gridSize) + 1;
        const col = (cellIndex % gridSize) + 1;
        addToHistory(`${currentPlayer} placed at ${row},${col}`);
        
        // Check for win or draw
        if (checkWin()) {
            handleWin();
        } else if (checkDraw()) {
            handleDraw();
        } else {
            // Switch player
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateDisplay();
        }
    }
    
    function undoMove() {
        if (moveStack.length === 0 || !gameActive) return;
        
        // Get the previous state
        const prevState = moveStack.pop();
        
        // Restore the previous state
        board = prevState.board;
        currentPlayer = prevState.currentPlayer;
        gameActive = prevState.gameActive;
        
        // Update the board display
        const cells = document.querySelectorAll('.cell');
        cells.forEach((cell, index) => {
            cell.textContent = board[index];
            cell.classList.remove('x', 'o', 'winning-cell');
            if (board[index] !== '') {
                cell.classList.add(board[index].toLowerCase());
            }
        });
        
        // Update display
        updateDisplay();
        
        // Add to history
        addToHistory("Move undone");
    }
    
    function makeBotMove() {
        let move;
        
        switch(botDifficulty) {
            case 'easy':
                move = getRandomMove();
                break;
            case 'medium':
                move = Math.random() < 0.5 ? getWinningOrBlockingMove() : getRandomMove();
                break;
            case 'hard':
                move = getBestMove();
                break;
        }
        
        if (move !== undefined) {
            makeMove(move);
        }
    }
    
    function getRandomMove() {
        const availableMoves = board.map((cell, index) => cell === '' ? index : null)
            .filter(cell => cell !== null);
        
        if (availableMoves.length === 0) return undefined;
        
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }
    
    function getWinningOrBlockingMove() {
        // Check for winning move
        for (let i = 0; i < winPatterns[gridSize].length; i++) {
            const [a, b, c] = winPatterns[gridSize][i];
            if (board[a] === currentPlayer && board[b] === currentPlayer && board[c] === '') return c;
            if (board[a] === currentPlayer && board[c] === currentPlayer && board[b] === '') return b;
            if (board[b] === currentPlayer && board[c] === currentPlayer && board[a] === '') return a;
        }
        
        // Check for blocking move
        const opponent = currentPlayer === 'X' ? 'O' : 'X';
        for (let i = 0; i < winPatterns[gridSize].length; i++) {
            const [a, b, c] = winPatterns[gridSize][i];
            if (board[a] === opponent && board[b] === opponent && board[c] === '') return c;
            if (board[a] === opponent && board[c] === opponent && board[b] === '') return b;
            if (board[b] === opponent && board[c] === opponent && board[a] === '') return a;
        }
        
        return getRandomMove();
    }
    
    function getBestMove() {
        // Simple implementation for Tic-Tac-Toe
        return getWinningOrBlockingMove();
    }
    
    function checkWin() {
        for (let i = 0; i < winPatterns[gridSize].length; i++) {
            const [a, b, c] = winPatterns[gridSize][i];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                // Highlight winning cells
                const cells = document.querySelectorAll('.cell');
                cells[a].classList.add('winning-cell');
                cells[b].classList.add('winning-cell');
                cells[c].classList.add('winning-cell');
                return true;
            }
        }
        return false;
    }
    
    function checkDraw() {
        return !board.includes('') && !checkWin();
    }
    
    function handleWin() {
        gameActive = false;
        scores[currentPlayer]++;
        updateScores();
        
        // Show win modal
        showResultModal(`${playerNames[currentPlayer]} (${currentPlayer}) Wins!`, `${playerNames[currentPlayer]} has won the game!`);
        
        // Add confetti
        createConfetti();
        
        // Add to history
        addToHistory(`${playerNames[currentPlayer]} (${currentPlayer}) wins!`);
    }
    
    function handleDraw() {
        gameActive = false;
        scores.draws++;
        updateScores();
        
        // Show draw modal
        showResultModal("It's a Draw!", "The game ended in a draw.");
        
        // Add to history
        addToHistory("It's a draw!");
    }
    
    function showResultModal(title, message) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        resultModal.style.display = 'flex';
    }
    
    function updateDisplay() {
        currentSymbolElement.textContent = currentPlayer;
        currentPlayerElement.textContent = playerNames[currentPlayer];
    }
    
    function updateScores() {
        player1ScoreElement.textContent = scores.X;
        player2ScoreElement.textContent = scores.O;
        drawScoreElement.textContent = scores.draws;
    }
    
    function updatePlayerNames() {
        playerNames.X = player1Input.value || 'Player 1';
        playerNames.O = player2Input.value || 'Player 2';
        
        player1NameElement.textContent = `${playerNames.X} (X)`;
        player2NameElement.textContent = `${playerNames.O} (O)`;
        
        updateDisplay();
    }
    
    function addToHistory(message) {
        const timestamp = new Date().toLocaleTimeString();
        const listItem = document.createElement('li');
        listItem.textContent = `[${timestamp}] ${message}`;
        historyList.appendChild(listItem);
        historyList.scrollTop = historyList.scrollHeight;
        moveHistory.push(`[${timestamp}] ${message}`);
    }
    
    function clearHistory() {
        historyList.innerHTML = '';
        moveHistory = [];
        addToHistory('History cleared');
    }
    
    function setGameMode(mode) {
        gameMode = mode;
        document.getElementById('two-player-btn').classList.toggle('active', mode === 'two-player');
        document.getElementById('vs-bot-btn').classList.toggle('active', mode === 'vs-bot');
        
        addToHistory(`Game mode set to ${mode === 'two-player' ? 'Two Players' : 'VS Bot'}`);
        
        // If switching to vs bot and it's bot's turn, make a move
        if (mode === 'vs-bot' && currentPlayer === 'O' && gameActive) {
            setTimeout(makeBotMove, 600);
        }
    }
    
    function setBotDifficulty(difficulty) {
        botDifficulty = difficulty;
        document.getElementById('easy-btn').classList.toggle('active', difficulty === 'easy');
        document.getElementById('medium-btn').classList.toggle('active', difficulty === 'medium');
        document.getElementById('hard-btn').classList.toggle('active', difficulty === 'hard');
        
        addToHistory(`Bot difficulty set to ${difficulty}`);
    }
    
    function setGridSize(size) {
        gridSize = size;
        document.getElementById('size3-btn').classList.toggle('active', size === 3);
        document.getElementById('size4-btn').classList.toggle('active', size === 4);
        document.getElementById('size5-btn').classList.toggle('active', size === 5);
        
        addToHistory(`Grid size set to ${size}x${size}`);
        
        // Recreate the board with new size
        createBoard();
        restartGame();
    }
    
    function restartGame() {
        board = Array(gridSize * gridSize).fill('');
        currentPlayer = 'X';
        gameActive = true;
        moveStack = [];
        
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.classList.remove('x', 'o', 'winning-cell');
            cell.textContent = '';
        });
        
        updateDisplay();
        addToHistory('Game restarted');
    }
    
    function newGame() {
        scores = { X: 0, O: 0, draws: 0 };
        updateScores();
        restartGame();
        addToHistory('Started a new game');
    }
    
    function createConfetti() {
        const colors = ['#ff9e00', '#ff6b6b', '#51cf66', '#339af0', '#9b59b6', '#1abc9c'];
        const container = document.body;
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.width = (Math.random() * 10 + 5) + 'px';
            confetti.style.height = (Math.random() * 10 + 5) + 'px';
            confetti.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(confetti);
            
            // Remove confetti after animation completes
            setTimeout(() => {
                confetti.remove();
            }, 5000);
        }
    }
});