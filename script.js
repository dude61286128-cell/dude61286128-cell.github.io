// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Show corresponding content
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

// Tetris Game Logic
const board = document.getElementById('game-board');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const nextPieceElement = document.getElementById('next-piece');
const startBtn = document.getElementById('start-btn');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let score = 0;
let level = 1;
let gameInterval;
let isPaused = false;
let currentPiece;
let nextPiece;

// Tetromino Shapes
const SHAPES = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]]
};

const COLORS = {
    I: 'type-I', O: 'type-O', T: 'type-T',
    S: 'type-S', Z: 'type-Z', J: 'type-J', L: 'type-L'
};

function createPiece() {
    const types = 'IOTSZJL';
    const type = types[Math.floor(Math.random() * types.length)];
    return {
        type: type,
        shape: SHAPES[type],
        x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2),
        y: 0,
        color: COLORS[type]
    };
}

function drawBoard() {
    board.innerHTML = '';
    grid.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const block = document.createElement('div');
                block.classList.add('cell', 'block', value);
                block.style.top = `${y * BLOCK_SIZE}px`;
                block.style.left = `${x * BLOCK_SIZE}px`;
                block.style.position = 'absolute'; // Ensure absolute positioning
                board.appendChild(block);
            }
        });
    });

    if (currentPiece) {
        currentPiece.shape.forEach((row, dy) => {
            row.forEach((value, dx) => {
                if (value) {
                    const block = document.createElement('div');
                    block.classList.add('cell', 'block', currentPiece.color);
                    block.style.top = `${(currentPiece.y + dy) * BLOCK_SIZE}px`;
                    block.style.left = `${(currentPiece.x + dx) * BLOCK_SIZE}px`;
                    block.style.position = 'absolute';
                    board.appendChild(block);
                }
            });
        });
    }
}

function drawNextPiece() {
    nextPieceElement.innerHTML = '';
    if (!nextPiece) return;

    // Calculate offset to center the piece
    const offsetX = (4 - nextPiece.shape[0].length) / 2;
    const offsetY = (4 - nextPiece.shape.length) / 2;

    nextPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                const block = document.createElement('div');
                block.classList.add('cell', 'block', nextPiece.color);
                block.style.gridColumnStart = Math.floor(dx + offsetX + 1);
                block.style.gridRowStart = Math.floor(dy + offsetY + 1);
                nextPieceElement.appendChild(block);
            }
        });
    });
}

function isValidMove(piece, offsetX, offsetY) {
    return piece.shape.every((row, dy) => {
        return row.every((value, dx) => {
            if (!value) return true;
            const newX = piece.x + dx + offsetX;
            const newY = piece.y + dy + offsetY;
            return (
                newX >= 0 &&
                newX < COLS &&
                newY < ROWS &&
                (newY < 0 || grid[newY][newX] === 0)
            );
        });
    });
}

function rotatePiece() {
    const rotatedShape = currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[index]).reverse()
    );
    const prevShape = currentPiece.shape;
    currentPiece.shape = rotatedShape;
    if (!isValidMove(currentPiece, 0, 0)) {
        currentPiece.shape = prevShape; // Revert if invalid
    }
}

function mergePiece() {
    currentPiece.shape.forEach((row, dy) => {
        row.forEach((value, dx) => {
            if (value) {
                if (currentPiece.y + dy >= 0) {
                    grid[currentPiece.y + dy][currentPiece.x + dx] = currentPiece.color;
                }
            }
        });
    });
    checkLines();
    currentPiece = nextPiece;
    nextPiece = createPiece();
    if (!isValidMove(currentPiece, 0, 0)) {
        gameOver();
    }
    drawNextPiece();
}

function checkLines() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (grid[y].every(cell => cell !== 0)) {
            // Capture row colors before removing
            const rowColors = [...grid[y]];

            // Remove line
            grid.splice(y, 1);
            // Add new empty line at top
            grid.unshift(Array(COLS).fill(0));
            linesCleared++;

            // Explosion effect per block
            rowColors.forEach((color, x) => {
                createExplosion(x * BLOCK_SIZE, y * BLOCK_SIZE, color);
            });

            y++; // Check same row index again
        }
    }
    if (linesCleared > 0) {
        playExplosionSound(); // Play sound once per clear check, or per line? Let's play once for clearer audio.
        score += linesCleared * 100 * linesCleared;
        scoreElement.textContent = score;
        if (score > level * 500) {
            level++;
            levelElement.textContent = level;
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, Math.max(100, 1000 - (level * 50)));
        }
    }
}

// Sound Context
let audioCtx;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playExplosionSound() {
    if (!audioCtx) initAudio();

    // Create white noise buffer
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    // Filter for "crunch/shatter" (Highpass)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gainNode = audioCtx.createGain();

    // Connect graph
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Play with envelope
    const now = audioCtx.currentTime;
    gainNode.gain.setValueAtTime(0.2, now); // Quieter volume (0.2)
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15); // Quick decay for "snap"

    noise.start(now);
    noise.stop(now + 0.2);
}

function createExplosion(x, y, colorClass) {
    // Determine color from class
    // We can map the class string "type-I" to actual hex color or use computed style,
    // but hardcoding the map is faster and safer for particles.
    const colorMap = {
        'type-I': '#00f0f0', 'type-O': '#f0f000', 'type-T': '#a000f0',
        'type-S': '#00f000', 'type-Z': '#f00000', 'type-J': '#0000f0', 'type-L': '#f0a000'
    };
    const baseColor = colorMap[colorClass] || '#fff';

    // Block shatter effect
    for (let i = 0; i < 8; i++) { // 8 particles per block
        const particle = document.createElement('div');
        particle.classList.add('explosion-particle');
        particle.style.left = `${x + 15}px`; // Start at center of block
        particle.style.top = `${y + 15}px`;

        particle.style.background = baseColor;
        particle.style.borderRadius = '0'; // Square shards

        // Explosive spread
        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 80;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;

        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);

        // Random size shards
        const size = 3 + Math.random() * 5;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        // Small rotation
        particle.style.transform = `rotate(${Math.random() * 360}deg)`;

        board.appendChild(particle);
        setTimeout(() => particle.remove(), 800);
    }
}

function gameOver() {
    clearInterval(gameInterval);
    alert('Game Over! Score: ' + score);
    startBtn.disabled = false;
    startBtn.textContent = 'RESTART';
}

function gameLoop() {
    if (!isValidMove(currentPiece, 0, 1)) {
        mergePiece();
    } else {
        currentPiece.y++;
    }
    drawBoard();
}

function startGame() {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    score = 0;
    level = 1;
    scoreElement.textContent = score;
    levelElement.textContent = level;
    currentPiece = createPiece();
    nextPiece = createPiece();
    drawNextPiece();
    startBtn.disabled = true;
    startBtn.textContent = 'PLAYING...';
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, 1000);
    board.focus();
}

if (startBtn) {
    startBtn.addEventListener('click', startGame);
}

document.addEventListener('keydown', (e) => {
    if (!currentPiece || startBtn.disabled === false) return; // Only control when playing

    if (e.key === 'ArrowLeft') {
        if (isValidMove(currentPiece, -1, 0)) currentPiece.x--;
    } else if (e.key === 'ArrowRight') {
        if (isValidMove(currentPiece, 1, 0)) currentPiece.x++;
    } else if (e.key === 'ArrowDown') {
        if (isValidMove(currentPiece, 0, 1)) currentPiece.y++;
    } else if (e.key === 'ArrowUp') {
        rotatePiece();
    } else if (e.code === 'Space') {
        while (isValidMove(currentPiece, 0, 1)) {
            currentPiece.y++;
        }
        mergePiece();
    }
    drawBoard();
});

// Role Dice Tool Logic
let isSpinning = false;
const cube = document.querySelector('.cube');
const roles = [
    { name: "교실 쓸기", desc: "깨끗한 교실을 위해 바닥을 쓸어주세요." },
    { name: "쓰레기통 비우기", desc: "쓰레기통이 가득 차면 비워주세요." },
    { name: "창문열기", desc: "환기를 위해 창문을 열고 닫아주세요." },
    { name: "책상 줄 맞추기", desc: "책상과 의자 줄을 바르게 정리해주세요." },
    { name: "칠판 닦기", desc: "수업이 끝나면 칠판을 깨끗이 지워주세요." },
    { name: "청소함 정리", desc: "청소도구를 가지런히 정리해주세요." }
];

function rollDice() {
    if (isSpinning) return;
    isSpinning = true;

    const resultBox = document.getElementById('role-result');
    resultBox.classList.add('hidden');
    resultBox.classList.remove('active');

    // Add spinning class
    cube.classList.add('is-spinning');

    // Simulate thinking/rolling time
    setTimeout(() => {
        cube.classList.remove('is-spinning');

        // Pick random role
        const randomIndex = Math.floor(Math.random() * roles.length);
        const selectedRole = roles[randomIndex];

        // Apply a random final rotation (CSS) to make it look like it landed
        // Constrain X rotation to 0 to keep it upright as requested
        const xRand = 0;
        const yRand = Math.floor(Math.random() * 4) * 90;
        cube.style.transform = `translateZ(-150px) rotateX(${xRand}deg) rotateY(${yRand}deg)`;

        // Show result
        document.getElementById('role-name').textContent = selectedRole.name;
        document.getElementById('role-desc').textContent = selectedRole.desc;

        setTimeout(() => {
            resultBox.classList.remove('hidden');
            resultBox.classList.add('active'); // Re-trigger fadeUp
            isSpinning = false;
        }, 500); // Small delay after stop

    }, 2000); // Spin for 2 seconds
}

function resetDice() {
    // Hide result
    const resultBox = document.getElementById('role-result');
    resultBox.classList.add('hidden');

    // Reset cube position
    cube.style.transform = 'translateZ(-150px) rotateX(0deg) rotateY(0deg)';

    // Reset internal state if needed
    isSpinning = false;
}


/* Roulette Logic */
let currentRotation = 0;

function spinRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    const resultDiv = document.getElementById('roulette-result');
    const winnerText = document.getElementById('roulette-winner');

    // Hide previous result
    resultDiv.classList.add('hidden');
    resultDiv.classList.remove('active');

    // Calculate random spin
    // Minimum 5 full spins (1800 deg) + random angle
    const randomDegree = Math.floor(Math.random() * 360);
    const extraSpins = 360 * 5;
    const totalRotation = currentRotation + extraSpins + randomDegree;

    // Rotate
    wheel.style.transform = 'rotate(' + totalRotation + 'deg)';
    currentRotation = totalRotation;

    // Determine winner after animation (3s)
    setTimeout(() => {
        const actualDeg = totalRotation % 360;
        const effectiveAngle = (360 - actualDeg) % 360;
        const segmentSize = 72; // 360 / 5

        // Adjustment: Visual offset +1 index
        const winningIndex = (Math.floor(effectiveAngle / segmentSize) + 1) % 5;
        // winningIndex 0 -> Segment 1

        const items = ['손님모셔오기', '이런 사람 일어나', '유령기차', '릴레이 박수', '가가볼'];
        // Note: The segments are rendered in order 1..5.

        const winner = items[winningIndex];

        winnerText.textContent = winner;
        resultDiv.classList.remove('hidden');
        resultDiv.classList.add('active'); // Reuse active animation

    }, 4000);
}

function resetRoulette() {
    const resultDiv = document.getElementById('roulette-result');
    resultDiv.classList.add('hidden');
    spinRoulette();
}
