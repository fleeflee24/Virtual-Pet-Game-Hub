// petApp.js
document.addEventListener('DOMContentLoaded', () => {
    // Wrap main logic in try...catch for better error reporting
    try {
        // --- DOM Elements ---
        const coinCountSpan = document.getElementById('coin-count');
        const gemCountSpan = document.getElementById('gem-count');
        const claimBonusButton = document.getElementById('claim-bonus-button');
        const bonusMessageP = document.getElementById('bonus-message');
        const streakCountSpan = document.getElementById('streak-count');
        const playColorSortButton = document.getElementById('play-color-sort-button');
        const colorSortGameArea = document.getElementById('color-sort-game-area'); // Inline Game Area
        const closeGameButton = document.getElementById('close-game-button'); // Close button for inline game
        const coinsDisplaySpan = document.getElementById('coins');
        const redPandaDisplayDiv = document.getElementById('red-panda-display');
        const cosmeticButtons = document.querySelectorAll('#cosmetics-controls button');
        const manualSleepButton = document.getElementById('manual-sleep-button');
        const manualWakeButton = document.getElementById('manual-wake-button');

        // --- Game State Variables ---
        let coins = 0, gems = 0, lastLoginDate = null, loginStreak = 0;
        let currentPetLook = 'base', ownedCosmetics = ['base'];
        let isSleeping = false, isManualSleep = false, sleepCheckInterval = null;
        let colorSortHighScore = 0; // <-- ADDED High Score state

        // --- Constants ---
        const STORAGE_KEYS = {
            COINS: 'petApp.coins', GEMS: 'petApp.gems', LAST_LOGIN: 'petApp.lastLoginDate',
            STREAK: 'petApp.loginStreak', PET_LOOK: 'petApp.petLook',
            OWNED_COSMETICS: 'petApp.ownedCosmetics', IS_SLEEPING: 'petApp.isSleeping',
            IS_MANUAL_SLEEP: 'petApp.isManualSleep',
            COLOR_SORT_HIGH_SCORE: 'petApp.colorSortHighScore' // <-- ADDED High Score key
        };
        const DAILY_BONUS_REWARDS = [
            { type: 'coins', amount: 50 }, { type: 'coins', amount: 75 }, { type: 'coins', amount: 100 },
            { type: 'gems', amount: 1 }, { type: 'coins', amount: 150 }, { type: 'coins', amount: 200 },
            { type: 'gems', amount: 3 }
        ];
        // Use Percentages for responsive background positioning
        const PET_LOOKS = {
            'base':      '0% 0%',     // Top-Left
            'cowboy':    '100% 0%',   // Top-Right
            'sleeping':  '0% 100%',   // Bottom-Left
            'gentleman': '100% 100%'  // Bottom-Right
        };
        const COSMETICS = {
            'cowboy': { name: 'Cowboy', cost: 100, spriteKey: 'cowboy' },
            'gentleman': { name: 'Gentleman', cost: 150, spriteKey: 'gentleman' }
        };

        // --- Utility Functions ---
        function getTodayDateString() { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
        function isYesterday(dateString) { const y=new Date(); y.setDate(y.getDate()-1); return dateString === `${y.getFullYear()}-${String(y.getMonth()+1).padStart(2,'0')}-${String(y.getDate()).padStart(2,'0')}`; }

        // --- Persistence (LocalStorage) ---
        function saveGameData() {
            try {
                localStorage.setItem(STORAGE_KEYS.COINS, coins.toString());
                localStorage.setItem(STORAGE_KEYS.GEMS, gems.toString());
                if (lastLoginDate) localStorage.setItem(STORAGE_KEYS.LAST_LOGIN, lastLoginDate); else localStorage.removeItem(STORAGE_KEYS.LAST_LOGIN);
                localStorage.setItem(STORAGE_KEYS.STREAK, loginStreak.toString());
                localStorage.setItem(STORAGE_KEYS.PET_LOOK, currentPetLook);
                localStorage.setItem(STORAGE_KEYS.OWNED_COSMETICS, JSON.stringify(ownedCosmetics));
                localStorage.setItem(STORAGE_KEYS.IS_SLEEPING, JSON.stringify(isSleeping));
                localStorage.setItem(STORAGE_KEYS.IS_MANUAL_SLEEP, JSON.stringify(isManualSleep));
                localStorage.setItem(STORAGE_KEYS.COLOR_SORT_HIGH_SCORE, colorSortHighScore.toString()); // <-- ADDED Save High Score
            } catch (error) { console.error("Error saving game data:", error); }
        }

        function loadGameData() {
            try {
                coins = parseInt(localStorage.getItem(STORAGE_KEYS.COINS) || '0', 10);
                gems = parseInt(localStorage.getItem(STORAGE_KEYS.GEMS) || '0', 10);
                lastLoginDate = localStorage.getItem(STORAGE_KEYS.LAST_LOGIN);
                loginStreak = parseInt(localStorage.getItem(STORAGE_KEYS.STREAK) || '0', 10);
                currentPetLook = localStorage.getItem(STORAGE_KEYS.PET_LOOK) || 'base';
                const loadedOwned = JSON.parse(localStorage.getItem(STORAGE_KEYS.OWNED_COSMETICS) || '["base"]');
                ownedCosmetics = [...new Set(['base', ...loadedOwned])];
                isSleeping = JSON.parse(localStorage.getItem(STORAGE_KEYS.IS_SLEEPING) || 'false');
                isManualSleep = JSON.parse(localStorage.getItem(STORAGE_KEYS.IS_MANUAL_SLEEP) || 'false');
                colorSortHighScore = parseInt(localStorage.getItem(STORAGE_KEYS.COLOR_SORT_HIGH_SCORE) || '0', 10); // <-- ADDED Load High Score
                console.log("Game data loaded.");
            } catch (error) {
                console.error("Error loading game data:", error);
                coins = 0; gems = 0; lastLoginDate = null; loginStreak = 0;
                currentPetLook = 'base'; ownedCosmetics = ['base']; isSleeping = false; isManualSleep = false;
                colorSortHighScore = 0; // <-- ADDED Reset High Score in catch
            }
        }

        // --- UI Update ---
        function updateUI() {
            if (coinCountSpan) coinCountSpan.textContent = coins;
            if (gemCountSpan) gemCountSpan.textContent = gems;
            if (streakCountSpan) streakCountSpan.textContent = loginStreak;

            if (claimBonusButton && bonusMessageP) {
                const today = getTodayDateString();
                if (lastLoginDate === today) {
                    claimBonusButton.disabled = true;
                    bonusMessageP.textContent = "Bonus already claimed today. Come back tomorrow!";
                } else {
                    claimBonusButton.disabled = false;
                    let displayStreak = loginStreak;
                    if (lastLoginDate && !isYesterday(lastLoginDate)) displayStreak = 0;
                    const nextRewardIndex = (displayStreak % DAILY_BONUS_REWARDS.length);
                    const nextReward = DAILY_BONUS_REWARDS[nextRewardIndex];
                    bonusMessageP.textContent = `Claim your Day ${displayStreak + 1} bonus: ${nextReward.amount} ${nextReward.type === 'gems' ? '💎' : '🪙'}!`;
                }
            }
            updateCosmeticButtons();
            updateManualSleepButtons();
            // Update Color Sort UI if it's visible and initialized
            if (window.colorSortGame && typeof window.colorSortGame.updateGameUI === 'function') {
                window.colorSortGame.updateGameUI();
            }
        }

        // --- Pet Appearance & Sleep ---
        function applyVisualLook(lookName) {
            if (!redPandaDisplayDiv) return;
            if (PET_LOOKS[lookName]) {
                redPandaDisplayDiv.style.backgroundPosition = PET_LOOKS[lookName];
            } else {
                console.warn(`Visual look "${lookName}" not found. Applying base.`);
                if (PET_LOOKS['base']) redPandaDisplayDiv.style.backgroundPosition = PET_LOOKS['base'];
            }
        }

        function setSleepState(sleeping, manual = false) {
            const changingState = (isSleeping !== sleeping);
            isSleeping = sleeping;
            isManualSleep = manual;
            if (isSleeping) applyVisualLook('sleeping');
            else applyVisualLook(currentPetLook);
            updateManualSleepButtons();
            if (changingState) saveGameData();
        }

        function updateManualSleepButtons() {
            if (!manualSleepButton || !manualWakeButton) return;
            manualSleepButton.style.display = isSleeping ? 'none' : 'inline-block';
            manualWakeButton.style.display = isSleeping ? 'inline-block' : 'none';
        }

        function checkSleepTime() {
            if (isManualSleep) return;
            const currentHour = new Date().getHours();
            const shouldBeSleeping = (currentHour >= 23 || currentHour < 7);
            if (shouldBeSleeping && !isSleeping) setSleepState(true, false);
            else if (!shouldBeSleeping && isSleeping) setSleepState(false, false);
        }

        // --- Cosmetic Logic (Equip/Unequip Update) ---
        function updateCosmeticButtons() {
            cosmeticButtons.forEach(button => {
                const look = button.dataset.look;
                if (!look || !COSMETICS[look]) return;
                button.classList.remove('equipped-cosmetic');
                button.disabled = false;
                const cosmetic = COSMETICS[look];
                if (ownedCosmetics.includes(look)) {
                    if (currentPetLook === look) {
                        button.textContent = `Unequip ${cosmetic.name}`;
                        button.classList.add('equipped-cosmetic');
                    } else {
                        button.textContent = `Equip ${cosmetic.name}`;
                    }
                } else {
                    button.textContent = `Buy ${cosmetic.name} (${cosmetic.cost} 🪙)`;
                    if (coins < cosmetic.cost) button.disabled = true;
                }
            });
        }

        function buyCosmetic(lookToBuy) {
            if (!COSMETICS[lookToBuy] || ownedCosmetics.includes(lookToBuy)) return;
            const cosmetic = COSMETICS[lookToBuy];
            if (spendCoins(cosmetic.cost)) {
                ownedCosmetics.push(lookToBuy);
                console.log(`Purchased ${cosmetic.name}!`);
                equipCosmetic(lookToBuy);
            } else { console.log(`Not enough coins for ${cosmetic.name}.`); }
        }

        function equipCosmetic(lookToEquip) {
            if (lookToEquip !== 'base' && !ownedCosmetics.includes(lookToEquip)) return;
            if (currentPetLook === lookToEquip) return;
            currentPetLook = lookToEquip;
            console.log(`Equipped ${lookToEquip}`);
            if (!isSleeping) applyVisualLook(currentPetLook);
            saveGameData();
            updateCosmeticButtons();
        }

        // --- Currency Management ---
        function addCoins(amount) {
            if (amount <= 0 || isNaN(amount)) return;
            coins += amount;
            if (coinsDisplaySpan) {
                 coinsDisplaySpan.classList.add('coin-flash');
                 setTimeout(() => { coinsDisplaySpan.classList.remove('coin-flash'); }, 600);
            }
            updateUI(); saveGameData();
        }
        function spendCoins(amount) {
            if (amount <= 0 || isNaN(amount) || coins < amount) return false;
            coins -= amount;
            updateUI(); saveGameData();
            return true;
        }
        function getCoins() { return coins; }
        function addGems(amount) {
            if (amount <= 0 || isNaN(amount)) return;
            gems += amount;
            updateUI(); saveGameData();
        }

        // --- High Score Management (Color Sort) --- <-- ADDED Section
        function updateColorSortHighScore(level) {
            if (level > colorSortHighScore) {
                colorSortHighScore = level;
                console.log(`New Color Sort High Score: ${colorSortHighScore}`);
                saveGameData(); // Save immediately when high score changes
                updateUI(); // Update the UI in case the high score is displayed elsewhere
            }
        }
        function getColorSortHighScore() {
            return colorSortHighScore;
        }

        // --- Daily Bonus Logic ---
        function claimDailyBonus() {
            const today = getTodayDateString();
            if (lastLoginDate === today) return;
            if (lastLoginDate && isYesterday(lastLoginDate)) loginStreak++; else loginStreak = 1;
            let rewardIndex = (loginStreak - 1) % DAILY_BONUS_REWARDS.length;
            const reward = DAILY_BONUS_REWARDS[rewardIndex];
            let message = "";
            if (reward.type === 'coins') { addCoins(reward.amount); message = `Awesome! ${reward.amount} 🪙!`; }
            else if (reward.type === 'gems') { addGems(reward.amount); message = `Fantastic! ${reward.amount} 💎!`; }
            lastLoginDate = today;
            if (bonusMessageP) bonusMessageP.textContent = `${message} Streak: ${loginStreak} day(s).`;
            saveGameData(); updateUI();
        }

        // --- Inline Game Area Control ---
        function showGameArea() {
            if (!colorSortGameArea) { console.error("Game Area not found!"); return; }
            colorSortGameArea.style.display = 'block';
            if (playColorSortButton) playColorSortButton.disabled = true;

            // Ensure window.petApp has all necessary functions before initializing game
            if (!window.petApp) {
                 window.petApp = {
                     addCoins,
                     spendCoins,
                     getCoins,
                     updateColorSortHighScore, // <-- ADDED
                     getColorSortHighScore      // <-- ADDED
                 };
                 console.warn("window.petApp defined in showGameArea.");
            } else {
                // Ensure existing object has the new functions
                window.petApp.updateColorSortHighScore = updateColorSortHighScore;
                window.petApp.getColorSortHighScore = getColorSortHighScore;
            }

            if (window.colorSortGame && typeof window.colorSortGame.init === 'function') {
                 console.log("Calling colorSortGame.init...");
                 window.colorSortGame.init(window.petApp);
            } else { console.error("Color Sort Game script/init missing."); }
        }

        function hideGameArea() {
            if (!colorSortGameArea) { console.error("Game Area not found!"); return; }
            colorSortGameArea.style.display = 'none';
            if (playColorSortButton) playColorSortButton.disabled = false;

            if (window.colorSortGame && typeof window.colorSortGame.shutdown === 'function') {
                console.log("Calling colorSortGame.shutdown...");
                window.colorSortGame.shutdown();
            }
        }

        // --- Define window.petApp EARLY ---
        window.petApp = {
            addCoins: addCoins,
            spendCoins: spendCoins,
            getCoins: getCoins,
            updateColorSortHighScore: updateColorSortHighScore, // <-- ADDED
            getColorSortHighScore: getColorSortHighScore     // <-- ADDED
        };
        console.log("window.petApp defined.");


        // --- Event Listeners ---
        console.log("Attaching event listeners...");
        if (claimBonusButton) {
            claimBonusButton.addEventListener('click', claimDailyBonus);
            console.log("Attached listener to claimBonusButton.");
        } else { console.error("Claim Bonus Button not found!"); }

        if (playColorSortButton) {
            playColorSortButton.addEventListener('click', showGameArea);
            console.log("Attached listener to playColorSortButton.");
        } else { console.error("Play Color Sort Button not found!"); }

        if (closeGameButton) {
            closeGameButton.addEventListener('click', hideGameArea);
            console.log("Attached listener to closeGameButton.");
        } else { console.error("Close Game Button not found!"); }

        cosmeticButtons.forEach(button => {
            button.addEventListener('click', () => {
                const look = button.dataset.look;
                if (!look || !COSMETICS[look]) return;
                if (ownedCosmetics.includes(look)) {
                    if (currentPetLook === look) equipCosmetic('base'); // Unequip
                    else equipCosmetic(look); // Equip
                } else { buyCosmetic(look); } // Buy
            });
        });
        console.log("Attached listeners to cosmeticButtons.");

        if (manualSleepButton) {
            manualSleepButton.addEventListener('click', () => setSleepState(true, true));
            console.log("Attached listener to manualSleepButton.");
        } else { console.error("Manual Sleep Button not found!"); }

        if (manualWakeButton) {
            manualWakeButton.addEventListener('click', () => setSleepState(false, true));
            console.log("Attached listener to manualWakeButton.");
        } else { console.error("Manual Wake Button not found!"); }


        // --- Initialization ---
        console.log("Initializing Pet App state...");
        loadGameData();
        if (isSleeping) applyVisualLook('sleeping'); else applyVisualLook(currentPetLook);
        updateUI();
        checkSleepTime();
        if (sleepCheckInterval) clearInterval(sleepCheckInterval);
        sleepCheckInterval = setInterval(checkSleepTime, 60000);

        console.log("Pet App Initialized successfully.");

    } catch (error) {
        console.error("CRITICAL ERROR during Pet App initialization:", error);
        const container = document.getElementById('app-container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.style.color = 'red'; errorDiv.style.border = '2px solid red';
            errorDiv.style.padding = '10px'; errorDiv.style.marginTop = '20px';
            errorDiv.textContent = `A critical error occurred: ${error.message}. Check console (F12).`;
            container.appendChild(errorDiv);
        }
    }
}); // End DOMContentLoaded
