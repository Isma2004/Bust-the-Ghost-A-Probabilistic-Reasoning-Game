document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("grid");
    const scoreDisplay = document.getElementById("score");
    const bustsDisplay = document.getElementById("busts");
    const bustButton = document.getElementById("bust-button");
    const viewToggle = document.getElementById("view-probabilities");
    const directionFeedback = document.getElementById("directionFeedback");

    const gridSizeX = 8;
    const gridSizeY = 13;
    let score, remainingBusts, ghostPosition, probabilities;
    let bustMode = false;
    let gameOver = false;

    startNewGame();

    function startNewGame() {
        score = 20;
        remainingBusts = 2;
        ghostPosition = PlaceGhost();
        probabilities = ComputeInitialPriorProbabilities(gridSizeX, gridSizeY);
        scoreDisplay.textContent = `Remaining Credit: ${score}`;
        bustsDisplay.textContent = `Remaining Busts: ${remainingBusts}`;
        directionFeedback.textContent = "Direction Sensor: N/A";
        bustMode = false;
        gameOver = false;
        grid.innerHTML = "";
        createGrid();
    }

    function showWinMessage() {
        const winMessage = document.createElement("div");
        winMessage.className = "central-win-message";
        winMessage.textContent = "Congratulations! You've caught the ghost!";
        document.getElementById("grid").appendChild(winMessage);
        setTimeout(() => winMessage.remove(), 3000);  // Remove after 3 seconds
    }
    function showLossMessage() {
        const lossMessage = document.createElement("div");
        lossMessage.className = "central-loss-message";
        lossMessage.textContent = "Game Over! The ghost got away!";
        document.getElementById("grid").appendChild(lossMessage);
        setTimeout(() => lossMessage.remove(), 3000);  // Remove after 3 seconds
    }
    
    function displayMessage(msg, type = "info") {
        const messageBoard = document.getElementById("message");
        messageBoard.textContent = msg;
        messageBoard.className = type;
        messageBoard.classList.add("animate-message");
        setTimeout(() => messageBoard.classList.remove("animate-message"), 2000);
    }

    function createGrid() {
        grid.style.gridTemplateColumns = `repeat(${gridSizeY}, 50px)`;
        for (let x = 0; x < gridSizeX; x++) {
            for (let y = 0; y < gridSizeY; y++) {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.addEventListener("click", () => handleClick(x, y, cell));
                grid.appendChild(cell);
            }
        }
    }

    function PlaceGhost() {
        const xg = Math.floor(Math.random() * gridSizeX);
        const yg = Math.floor(Math.random() * gridSizeY);
        return { x: xg, y: yg };
    }

    function ComputeInitialPriorProbabilities(rows, cols) {
        const initialProb = 1 / (rows * cols);
        const probs = [];
        for (let i = 0; i < rows; i++) {
            const row = Array(cols).fill(initialProb);
            probs.push(row);
        }
        return probs;
    }

    const distanceSensorProbabilities = {
        red: { 0: 0.9, 1: 0.05, default: 0.05 },
        orange: { 1: 0.7, 2: 0.2, default: 0.1 },
        yellow: { 3: 0.6, 4: 0.3, default: 0.1 },
        green: { default: 1 },
    };

    const directionSensorProbabilities = {
        N: { N: 0.7, E: 0.1, S: 0.1, W: 0.1 },
        E: { N: 0.1, E: 0.7, S: 0.1, W: 0.1 },
        S: { N: 0.1, E: 0.1, S: 0.7, W: 0.1 },
        W: { N: 0.1, E: 0.1, S: 0.1, W: 0.7 },
    };

    function distanceSense(xclk, yclk) {
        const dist = Math.abs(xclk - ghostPosition.x) + Math.abs(yclk - ghostPosition.y);

        if (dist === 0) return "hit"; // Return "hit" for direct matches
        return getColorByDistance(dist);
    }

    
    function DistanceSense(xclk, yclk, dist, gx, gy) {
        // Only use gx and gy here
        const colorProbs = {
            0: "red",
            1: "orange",
            2: "orange",
            3: "yellow",
            4: "yellow",
            default: "green",
        };
        return colorProbs[dist] || colorProbs.default;
    }



    function handleClick(x, y, cell) {
        if (bustMode) {
            // Attempt a bust even if the cell was already clicked
            attemptBust(x, y, cell);
        } else {
            // If not in bust mode, check if the cell has been clicked before
            if (cell.dataset.clicked === "true") {
                // If already clicked in sensing mode, do nothing
                displayMessage("This cell has already been clicked in sensing mode.", "info");
                return;
            }
    
            // Mark the cell as clicked in sensing mode
            cell.dataset.clicked = "true";
            displayColorFeedback(x, y, cell);
            const trueDirection = getTrueDirection(x, y, ghostPosition.x, ghostPosition.y);
            const observedDirection = getObservedDirection(trueDirection);
            directionFeedback.textContent = `Direction Sensor: ${observedDirection}`;

            // Update posterior probabilities with both sensors
            UpdatePosteriorGhostLocationProbabilities(cell.color, x, y, observedDirection);
        }
    }

    function attemptBust(x, y, cell) {
        if (remainingBusts > 0) {
            const result = distanceSense(x, y);

            if (result === "hit") { // Check for a direct hit
                cell.classList.add("win");
                showWinMessage();
                setTimeout(resetGame, 1500);
            } else {
                remainingBusts--;
                bustsDisplay.textContent = `Remaining Busts: ${remainingBusts}`;
                if (remainingBusts === 0) {
                    displayMessage("Game over. You've used all your bust attempts.", "loss");
                    showLossMessage();
                    setTimeout(resetGame, 3000);
                }
            }
            bustMode = false;
        }
    }

    function displayColorFeedback(x, y, cell) {
        if (score <= 0) {
            displayMessage("You have no credit left. Game over.", "loss");
            showLossMessage();
            setTimeout(resetGame, 3000);
            return;
        }

        const dist = Math.abs(x - ghostPosition.x) + Math.abs(y - ghostPosition.y);
        const color = DistanceSense(x, y, dist, ghostPosition.x, ghostPosition.y);
        cell.classList.add(color);
        cell.color = color;
        score--;
        scoreDisplay.textContent = `Remaining Credit: ${score}`;

        if (score <= 0) {
            displayMessage("You have no credit left. Game over.", "loss");
            showLossMessage();
            setTimeout(resetGame, 3000);
        }
    }

    function UpdatePosteriorGhostLocationProbabilities(color, xclk, yclk, observedDirection) {
        const newProbabilities = probabilities.map((row, i) =>
            row.map((prob, j) => {
                const dist = Math.abs(i - xclk) + Math.abs(j - yclk);
                const distanceProb = getDistanceSensorProbability(color, dist);

                const trueDirection = getTrueDirection(xclk, yclk, i, j);
                const directionProb = getDirectionSensorProbability(trueDirection, observedDirection);

                const likelihood = distanceProb * directionProb;
                return likelihood * prob;
            })
        );

        // Normalize the probabilities
        const totalProb = newProbabilities.flat().reduce((acc, p) => acc + p, 0);
        probabilities = newProbabilities.map(row => row.map(p => p / totalProb));

        if (viewToggle.checked) displayProbabilities();
    }

    function getDistanceSensorProbability(color, dist) {
        const table = distanceSensorProbabilities[color] || {};
        return table[dist] || table.default || 0;
    }

    function getDirectionSensorProbability(trueDirection, observedDirection) {
        return directionSensorProbabilities[trueDirection][observedDirection] || 0;
    }

    function getTrueDirection(x1, y1, x2, y2) {
        if (x2 < x1) return "N";
        if (x2 > x1) return "S";
        if (y2 < y1) return "W";
        if (y2 > y1) return "E";
        return "N"; // Default when same position
    }

    function getObservedDirection(trueDirection) {
        const rand = Math.random();
        let cumulative = 0;
        for (let dir in directionSensorProbabilities[trueDirection]) {
            cumulative += directionSensorProbabilities[trueDirection][dir];
            if (rand <= cumulative) {
                return dir;
            }
        }
        return trueDirection; // Fallback
    }

    bustButton.addEventListener("click", () => {
        if (!gameOver) {
            bustMode = true;
        }
    });

    viewToggle.addEventListener("change", () => {
        if (viewToggle.checked) {
            displayProbabilities();
        } else {
            clearProbabilities();
        }
    });

    function displayProbabilities() {
        const cells = grid.querySelectorAll(".cell");
        cells.forEach(cell => {
            const x = parseInt(cell.dataset.x);
            const y = parseInt(cell.dataset.y);
            const prob = probabilities[x][y];
            cell.textContent = prob.toFixed(2);
        });
    }

    function clearProbabilities() {
        const cells = grid.querySelectorAll(".cell");
        cells.forEach(cell => {
            cell.textContent = "";
        });
    }


    function resetGame() {
        startNewGame();
    }
});
