// colorSortGame.js
(() => {
    // --- Game Variables & State ---
    let gameInitialized = false;
    let glasses = [];
    let currentLevel = 1;
    let selectedGlassIndex = null;
    let initialLevelState = [];
    let currentLevelConfig = {};
    let petAppInterface = null;

    // --- DOM Elements ---
    let gameArea, gameContainer, levelNumberSpan, restartButton, restartCostSpan, levelUpArrow, gameInfoDiv, rewardDisplaySpan;
    let currentCoinsSpan, highScoreSpan; // <-- ADDED DOM Element variables

    // --- Base Game Constants ---
    // Updated Colors
    const baseColors = [
        "#ff0000", // Red
        "#0066ff", // Blue
        "#00cc00", // Green
        "#ffff00", // Yellow
        "#ff00ff", // Magenta
        "#00ffff", // Cyan
        "#ff9900", // Orange
        "#9900ff", // Purple
        "#009999", // Teal
        "#ccff00", // Lime
        "#ff66cc", // Pink
        "#996633"  // Brown
    ];
    const glassCapacity = 4;
    const restartCost = 10;
    // levelWinReward dynamic

    // --- Helper Functions ---
    function deepCopy(data) { return JSON.parse(JSON.stringify(data)); }
    function calculateLevelReward(level) { const tier = Math.floor((level - 1) / 5); return (tier + 1) * 5; }

    // --- Level Configuration ---
    function getGameConfigForLevel(level) {
        let numGlasses;
        if (level <= 2) numGlasses = 4;
        else if (level <= 8) numGlasses = 4 + Math.ceil((level - 2) / 2);
        else numGlasses = 8 + Math.ceil((level - 8) / 3);
        const numFilledGlasses = Math.max(2, numGlasses - 2);
        const totalSandUnits = numFilledGlasses * glassCapacity;
        let numColors = Math.min(baseColors.length, numFilledGlasses);
        while (numColors > 1 && totalSandUnits % numColors !== 0) numColors--;
        if (numColors <= 0 && totalSandUnits > 0) numColors = 1;
        if (totalSandUnits % numColors !== 0 && numColors === 1 && totalSandUnits > 0) console.warn(`Level ${level}: Only 1 color possible.`);
        else if (totalSandUnits % numColors !== 0) { console.error(`Level ${level}: Cannot find suitable color count. Defaulting.`); numColors = 2; }
        const unitsPerColor = totalSandUnits > 0 ? totalSandUnits / numColors : 0;
        if (!Number.isInteger(unitsPerColor) && totalSandUnits > 0) { console.error(`Level ${level} config error: unitsPerColor (${unitsPerColor}).`); return { numGlasses: 4, numColors: 2, unitsPerColor: 4, numFilledGlasses: 2 }; }
        return { numGlasses, numColors, unitsPerColor, numFilledGlasses };
    }

    // --- Initialization ---
    function generateInitialSand(config) {
        if (!config || typeof config.unitsPerColor !== 'number' || typeof config.numColors !== 'number' || config.numColors <= 0 || config.unitsPerColor <= 0) {
             console.error("generateInitialSand: Invalid config received", config); return [];
        }
        const allSandUnits = []; const colorsForLevel = baseColors.slice(0, config.numColors);
        for (const color of colorsForLevel) { for (let i = 0; i < config.unitsPerColor; i++) allSandUnits.push(color); }
        for (let i = allSandUnits.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [allSandUnits[i], allSandUnits[j]] = [allSandUnits[j], allSandUnits[i]]; }
        return allSandUnits;
    }

    function initializeLevel() {
        console.log("colorSortGame: initializeLevel called");
        if (!gameInitialized) { console.error("colorSortGame: Cannot initialize level, game not initialized."); return; }
        currentLevelConfig = getGameConfigForLevel(currentLevel);
        const config = currentLevelConfig;
        glasses.length = 0;
        const sandUnits = generateInitialSand(config);
        if (sandUnits.length !== config.numFilledGlasses * glassCapacity) {
            console.error(`colorSortGame: Level ${currentLevel} Sand Generation Error. Expected ${config.numFilledGlasses * glassCapacity}, got ${sandUnits.length}.`); return;
        }
        for (let i = 0; i < config.numGlasses; i++) {
            if (i < config.numFilledGlasses) glasses.push(sandUnits.splice(0, glassCapacity));
            else glasses.push([]);
        }
        initialLevelState = deepCopy(glasses);
        selectedGlassIndex = null;
        console.log("colorSortGame: Level initialized, calling renderAllGlasses...");
        renderAllGlasses(); // This will call updateGameUI at the end
    }

    // --- UI Update (Game Specific) ---
    function updateGameUI() {
        if (!gameInitialized || !petAppInterface) return;
        if (levelNumberSpan) levelNumberSpan.textContent = currentLevel;
        if (restartCostSpan) restartCostSpan.textContent = restartCost;
        if (rewardDisplaySpan) rewardDisplaySpan.textContent = calculateLevelReward(currentLevel);

        // Update Current Coins Display <-- ADDED
        if (currentCoinsSpan && typeof petAppInterface.getCoins === 'function') {
            currentCoinsSpan.textContent = petAppInterface.getCoins();
        } else if (currentCoinsSpan) {
            currentCoinsSpan.textContent = 'N/A'; // Fallback if function missing
        }

        // Update High Score Display <-- ADDED
        if (highScoreSpan && typeof petAppInterface.getColorSortHighScore === 'function') {
            highScoreSpan.textContent = petAppInterface.getColorSortHighScore();
        } else if (highScoreSpan) {
            highScoreSpan.textContent = 'N/A'; // Fallback if function missing
        }

        if (restartButton) {
            try {
                if (typeof petAppInterface.getCoins === 'function') {
                    restartButton.disabled = petAppInterface.getCoins() < restartCost;
                } else { console.error("colorSortGame: petAppInterface.getCoins is not a function!"); restartButton.disabled = true; }
            } catch (e) { console.error("colorSortGame: Error accessing petAppInterface.getCoins():", e); restartButton.disabled = true; }
        }
    }

    // --- Rendering ---
    function renderAllGlasses() {
        console.log("colorSortGame: renderAllGlasses START");
        if (!gameInitialized || !gameContainer) {
            console.error("colorSortGame: Cannot render glasses, game not initialized or container missing.");
            gameArea = document.getElementById('color-sort-game-area');
            if(gameArea) gameContainer = gameArea.querySelector("#cs-game-container");
            if (!gameContainer) return;
        }

        gameContainer.innerHTML = "";
        console.log(`colorSortGame: glasses data array length: ${glasses.length}`);

        if (glasses.length === 0) {
            console.warn("colorSortGame: glasses array is empty, nothing to render.");
            updateGameUI(); return;
        }

        let glassesCreated = 0;
        glasses.forEach((glassData, index) => {
            const glassDiv = document.createElement("div");
            glassDiv.classList.add("glass");
            glassDiv.dataset.index = index;

            if (!Array.isArray(glassData)) {
                console.error(`colorSortGame: Invalid glassData for index ${index}:`, glassData);
                glassData = [];
            }

            glassData.forEach((color, layerIndex) => {
                const sandDiv = document.createElement("div");
                sandDiv.classList.add("sand-layer");
                sandDiv.style.backgroundColor = color;
                sandDiv.style.bottom = `${layerIndex * 25}%`;
                glassDiv.appendChild(sandDiv);
            });

            if (index === selectedGlassIndex) glassDiv.classList.add("selected");

            try {
                gameContainer.appendChild(glassDiv);
                glassesCreated++;
                if (index === 0) { // Log computed style for first glass
                    const computedStyle = window.getComputedStyle(glassDiv);
                    // console.log(`colorSortGame: Glass 0 computed style - display: ${computedStyle.display}, width: ${computedStyle.width}, height: ${computedStyle.height}, border: ${computedStyle.border}`);
                }
            } catch (e) {
                console.error(`colorSortGame: Error appending glassDiv ${index} to gameContainer:`, e);
            }
        });
        console.log(`colorSortGame: Finished loop. Rendered ${glassesCreated} glasses.`);
        updateGameUI(); // Update UI after rendering glasses
    }

    // --- Game Logic ---
    function getTopColor(glassIndex) { const glass = glasses[glassIndex]; return glass.length > 0 ? glass[glass.length - 1] : null; }
    function getPourableUnits(glassIndex) { const glass = glasses[glassIndex]; if (glass.length === 0) return { color: null, count: 0 }; const topColor = glass[glass.length - 1]; let count = 0; for (let i = glass.length - 1; i >= 0; i--) { if (glass[i] === topColor) count++; else break; } return { color: topColor, count: count }; }
    function canPour(fromIndex, toIndex) { if (fromIndex === toIndex || !glasses[fromIndex] || glasses[fromIndex].length === 0 || !glasses[toIndex] || glasses[toIndex].length >= glassCapacity) return false; const fromTopColor = getTopColor(fromIndex); const toTopColor = getTopColor(toIndex); return glasses[toIndex].length === 0 || fromTopColor === toTopColor; }
    function pourSand(fromIndex, toIndex) { const fromGlass = glasses[fromIndex]; const toGlass = glasses[toIndex]; const { count: pourCount } = getPourableUnits(fromIndex); const availableSpace = glassCapacity - toGlass.length; const unitsToMove = Math.min(pourCount, availableSpace); for (let i = 0; i < unitsToMove; i++) toGlass.push(fromGlass.pop()); selectedGlassIndex = null; renderAllGlasses(); checkWinCondition(); }

    // --- Win Condition ---
    function checkWinCondition() {
        const config = currentLevelConfig;
        if (!config || typeof config.numFilledGlasses !== 'number' || typeof config.numGlasses !== 'number') { console.error("checkWinCondition: Invalid level config."); return; }
        let sortedGlassCount = 0, emptyGlassCount = 0;
        for (const glass of glasses) {
            if (glass.length === 0) emptyGlassCount++;
            else if (glass.length === glassCapacity && glass.every(color => color === glass[0])) sortedGlassCount++;
        }
        if (sortedGlassCount === config.numFilledGlasses && emptyGlassCount === (config.numGlasses - config.numFilledGlasses)) {
            const rewardAmount = calculateLevelReward(currentLevel); // Calculate reward for completed level
            try {
                if (typeof petAppInterface.addCoins === 'function') petAppInterface.addCoins(rewardAmount);
                else console.error("colorSortGame: petAppInterface.addCoins is not a function!");

                // Update High Score BEFORE incrementing level <-- ADDED
                if (typeof petAppInterface.updateColorSortHighScore === 'function') {
                    petAppInterface.updateColorSortHighScore(currentLevel);
                } else {
                    console.warn("colorSortGame: petAppInterface.updateColorSortHighScore is not available.");
                }

            } catch (e) { console.error("colorSortGame: Error during win condition processing:", e); }

            currentLevel++; // Increment level AFTER rewarding and high score check
            if (levelUpArrow) levelUpArrow.classList.add('animate');
            setTimeout(() => { if (levelUpArrow) levelUpArrow.classList.remove('animate'); }, 1800);
            setTimeout(initializeLevel, 200); // Init next level
        }
     }

    // --- Button Handlers ---
    function handleRestartClick() {
        try {
             if (typeof petAppInterface.spendCoins !== 'function') { console.error("colorSortGame: petAppInterface.spendCoins is not a function!"); return; }
            if (petAppInterface.spendCoins(restartCost)) {
                glasses = deepCopy(initialLevelState); selectedGlassIndex = null; renderAllGlasses();
            } else { console.log("colorSortGame: Restart failed: Not enough coins."); }
        } catch (e) { console.error("colorSortGame: Error calling petAppInterface.spendCoins():", e); }
    }

    // --- Event Handling ---
    function handleGameContainerClick(event) {
        const clickedGlassDiv = event.target.closest('.glass');
        if (!clickedGlassDiv) return;
        const clickedIndex = parseInt(clickedGlassDiv.dataset.index);
        if (isNaN(clickedIndex) || !glasses[clickedIndex]) return;
        if (selectedGlassIndex === null) {
            if (glasses[clickedIndex].length > 0) { selectedGlassIndex = clickedIndex; renderAllGlasses(); }
        } else {
            if (clickedIndex === selectedGlassIndex) { selectedGlassIndex = null; renderAllGlasses(); }
            else if (canPour(selectedGlassIndex, clickedIndex)) pourSand(selectedGlassIndex, clickedIndex);
            else { selectedGlassIndex = null; renderAllGlasses(); }
        }
     }

    // --- Public Interface (init, shutdown) ---
    window.colorSortGame = {
        init: (appInterfaceFromMain) => {
            petAppInterface = appInterfaceFromMain;
            console.log("colorSortGame: init called.");
            // Add checks for new required functions <-- UPDATED Check
            if (!petAppInterface || typeof petAppInterface.getCoins !== 'function' || typeof petAppInterface.getColorSortHighScore !== 'function' || typeof petAppInterface.updateColorSortHighScore !== 'function') {
                 console.error("colorSortGame: Invalid or incomplete petAppInterface!", petAppInterface);
                 return;
            }
            if (gameInitialized) console.log("colorSortGame: Re-initializing game...");

            gameArea = document.getElementById('color-sort-game-area');
            if (!gameArea) { console.error("colorSortGame: Game Area not found!"); return; }
            gameContainer = gameArea.querySelector("#cs-game-container");
            levelNumberSpan = gameArea.querySelector("#cs-level-number");
            restartButton = gameArea.querySelector("#cs-restart-button");
            restartCostSpan = gameArea.querySelector("#cs-restart-cost-val");
            levelUpArrow = gameArea.querySelector("#cs-level-up-arrow");
            gameInfoDiv = gameArea.querySelector(".game-info");
            rewardDisplaySpan = gameArea.querySelector("#cs-reward-display");
            currentCoinsSpan = gameArea.querySelector("#cs-current-coins"); // <-- ADDED Find element
            highScoreSpan = gameArea.querySelector("#cs-high-score");       // <-- ADDED Find element

            // Update the check for essential elements <-- UPDATED Check
            if (!gameContainer || !restartButton || !rewardDisplaySpan || !currentCoinsSpan || !highScoreSpan) {
                console.error("colorSortGame: Essential game elements missing. Init failed.");
                // Log which elements are missing for easier debugging
                if (!gameContainer) console.error("Missing: #cs-game-container");
                if (!restartButton) console.error("Missing: #cs-restart-button");
                if (!rewardDisplaySpan) console.error("Missing: #cs-reward-display");
                if (!currentCoinsSpan) console.error("Missing: #cs-current-coins");
                if (!highScoreSpan) console.error("Missing: #cs-high-score");
                return;
            }

            gameContainer.removeEventListener('click', handleGameContainerClick);
            gameContainer.addEventListener('click', handleGameContainerClick);
            restartButton.removeEventListener('click', handleRestartClick);
            restartButton.addEventListener('click', handleRestartClick);

            gameInitialized = true;
            // currentLevel = 1; // Reset level? Or load from save? For now, reset.
            console.log("colorSortGame: Elements found/checked. Calling initializeLevel after short delay...");
            setTimeout(initializeLevel, 50);
        },

        shutdown: () => {
            if (!gameInitialized) return;
            console.log("colorSortGame: Shutting down...");
            if (gameContainer) gameContainer.removeEventListener('click', handleGameContainerClick);
            if (restartButton) restartButton.removeEventListener('click', handleRestartClick);
            glasses = []; selectedGlassIndex = null; initialLevelState = [];
            if (gameContainer) gameContainer.innerHTML = "";
            gameInitialized = false; petAppInterface = null;
        },

        // Expose updateGameUI for external calls if needed (e.g., from petApp.js after coin changes)
        updateGameUI: updateGameUI
    };

})(); // End IIFE
