let gameState = {
    // Common state
    matchedPairs: [],
    score: 0,
    timeLeft: 300,
    timer: null,
    attempts: 0,
    
    // Matching game state
    currentTerms: [],
    selectedTerm: null,
    displayedDefinitions: [],
    
    // Fill in the blank state
    currentFillSentences: [],
    currentFillOptions: [],
    selectedOption: null,
    filledBlanks: [],
    currentSentenceIndex: 0,
    
    // User selections
    selectedUnit: 0,
    selectedCategory: "",
};

let currentGame = 'matching';

// Initialize UI
function initUI() {
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.innerHTML = '';
    
    // Populate unit selector - initially with all units
    data.units.forEach((unit, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = unit.name;
        unitSelect.appendChild(option);
    });
    
    // Set initial unit and populate categories
    gameState.selectedUnit = 0;
    updateCategorySelect();
    
    // Setup event listeners for selectors
    unitSelect.addEventListener('change', function() {
        gameState.selectedUnit = parseInt(this.value);
        updateCategorySelect();
    });
    
    document.getElementById('categorySelect').addEventListener('change', function() {
        gameState.selectedCategory = this.value;
        startGame();
    });
    
    // Setup tab handling
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`${tabId}Game`).classList.add('active');
            
            currentGame = tabId;
            
            // Filter units when switching to "filling" tab
            if (tabId === 'filling') {
                filterUnitsForFillGame();
            } else {
                // Reset to show all units for matching game
                populateAllUnits();
            }
            
            startGame();
        });
    });
}

function populateAllUnits() {
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.innerHTML = '';
    
    data.units.forEach((unit, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = unit.name;
        unitSelect.appendChild(option);
    });
    
    gameState.selectedUnit = 0;
    updateCategorySelect();
}

function filterUnitsForFillGame() {
    const unitSelect = document.getElementById('unitSelect');
    unitSelect.innerHTML = '';
    
    let validUnitFound = false;
    let firstValidIndex = -1;
    
    data.units.forEach((unit, index) => {
        // Check if this unit has any category with suitable content for Fill in Blank
        const hasFillContent = Object.keys(unit.categories).some(category => {
            const items = unit.categories[category];
            return items.some(item => (item.sentence && item.answer) || 
                              (category === 'Fill in the Blank'));
        });
        
        if (hasFillContent) {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = unit.name;
            unitSelect.appendChild(option);
            
            if (!validUnitFound) {
                firstValidIndex = index;
                validUnitFound = true;
            }
        }
    });
    
    // Select first valid unit
    if (validUnitFound) {
        gameState.selectedUnit = firstValidIndex;
        unitSelect.value = firstValidIndex;
    } else {
        gameState.selectedUnit = -1;
    }
    
    updateCategorySelect();
}

function updateCategorySelect() {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.innerHTML = '';
    
    if (gameState.selectedUnit < 0 || gameState.selectedUnit >= data.units.length) {
        gameState.selectedCategory = "";
        return;
    }
    
    const unitData = data.units[gameState.selectedUnit];
    let categories = Object.keys(unitData.categories);
    
    // Filter categories for Fill in Blank if in filling mode
    if (currentGame === 'filling') {
        // First, look for explicit "Fill in the Blank" category
        if (categories.includes('Fill in the Blank')) {
            // Only show the Fill in the Blank category
            categories = ['Fill in the Blank'];
        } else {
            // Otherwise, check each category for items with sentences
            categories = categories.filter(category => {
                const items = unitData.categories[category];
                return items.some(item => item.sentence && item.answer);
            });
        }
    }
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
    
    // Set initial category
    if (categories.length > 0) {
        gameState.selectedCategory = categories[0];
        categorySelect.value = categories[0];
    } else {
        gameState.selectedCategory = "";
    }
    
    startGame();
}

function getCurrentData() {
    if (gameState.selectedUnit < 0 || !gameState.selectedCategory) {
        return [];
    }
    
    const unitData = data.units[gameState.selectedUnit];
    return unitData.categories[gameState.selectedCategory] || [];
}

function showFeedbackTooltip(message, isError = false) {
    const tooltip = document.getElementById('feedbackTooltip');
    tooltip.textContent = message;
    tooltip.style.backgroundColor = isError ? 'rgba(220, 38, 38, 0.9)' : 'rgba(5, 150, 105, 0.9)';
    tooltip.classList.add('show');
    
    setTimeout(() => {
        tooltip.classList.remove('show');
    }, 2000);
}

function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// MATCHING GAME FUNCTIONS
function getRandomTerms() {
    const availableTerms = getCurrentData();
    
    if (availableTerms.length === 0) {
        return [];
    }
    
    const shuffledTerms = shuffleArray(availableTerms);
    // Limit to 10 terms maximum or available terms count
    const termCount = Math.min(shuffledTerms.length, 10);
    
    gameState.currentTerms = shuffledTerms.slice(0, termCount);
    // For definitions, use all terms to match
    gameState.displayedDefinitions = [...gameState.currentTerms];
    
    return gameState.currentTerms;
}

function renderMatchingGame() {
    const termsContainer = document.getElementById('terms');
    const definitionsContainer = document.getElementById('definitions');
    
    termsContainer.innerHTML = '';
    definitionsContainer.innerHTML = '';
    
    if (gameState.currentTerms.length === 0) {
        termsContainer.innerHTML = '<div class="no-data">No terms available for selected unit/category</div>';
        definitionsContainer.innerHTML = '<div class="no-data">No definitions available</div>';
        return;
    }
    
    gameState.currentTerms.forEach((item, index) => {
        const termDiv = document.createElement('div');
        termDiv.className = `term-item ${gameState.matchedPairs.includes(item.term) ? 'matched' : ''}`;
        termDiv.setAttribute('data-term', item.term);
        termDiv.setAttribute('data-index', index);
        termDiv.textContent = item.term;
        termsContainer.appendChild(termDiv);
    });

    const shuffledDefinitions = shuffleArray([...gameState.displayedDefinitions]);
    shuffledDefinitions.forEach(item => {
        const defDiv = document.createElement('div');
        defDiv.className = `definition-item ${gameState.matchedPairs.includes(item.term) ? 'matched' : ''}`;
        defDiv.setAttribute('data-definition', item.definition);
        defDiv.setAttribute('data-term', item.term);
        defDiv.textContent = item.definition;
        definitionsContainer.appendChild(defDiv);
    });

    setupMatchingClickHandlers();
}

function setupMatchingClickHandlers() {
    if (gameState.selectedTerm) {
        gameState.selectedTerm.classList.remove('selected');
        gameState.selectedTerm = null;
    }

    document.querySelectorAll('.term-item:not(.matched)').forEach(term => {
        term.addEventListener('click', () => {
            if (gameState.selectedTerm) {
                gameState.selectedTerm.classList.remove('selected');
            }
            term.classList.add('selected');
            gameState.selectedTerm = term;
            
            // Show instruction for next step
            document.getElementById('instruction').textContent = "Now select the matching definition";
            document.getElementById('instruction').classList.remove('fade');
        });
    });

    document.querySelectorAll('.definition-item:not(.matched)').forEach(definition => {
        definition.addEventListener('click', () => {
            if (!gameState.selectedTerm) {
                showFeedbackTooltip("Please select a term first", true);
                return;
            }
            
            const termValue = gameState.selectedTerm.getAttribute('data-term');
            const correctTerm = definition.getAttribute('data-term');
            
            if (termValue === correctTerm) {
                gameState.matchedPairs.push(termValue);
                gameState.score += 10;
                updateScore(gameState.score);
                
                gameState.selectedTerm.classList.add('matched');
                definition.classList.add('matched');
                
                showFeedbackTooltip("Correct match! +10 points");
                document.getElementById('instruction').textContent = "Great job! Select another term";
                document.getElementById('instruction').classList.remove('fade');
                
                setTimeout(() => {
                    if (gameState.matchedPairs.length === gameState.displayedDefinitions.length) {
                        endGame(true);
                    }
                }, 500);
            } else {
                gameState.score = Math.max(0, gameState.score - 5);
                updateScore(gameState.score);
                
                gameState.selectedTerm.classList.add('wrong');
                definition.classList.add('wrong');
                
                gameState.attempts++;
                
                if (gameState.attempts >= 3) {
                    showFeedbackTooltip("That's not correct. Try again!", true);
                } else {
                    showFeedbackTooltip("Incorrect match. -5 points", true);
                }
                
                setTimeout(() => {
                    gameState.selectedTerm.classList.remove('wrong', 'selected');
                    definition.classList.remove('wrong');
                    gameState.selectedTerm = null;
                    
                    document.getElementById('instruction').textContent = "Select a term and match it with its correct definition";
                    document.getElementById('instruction').classList.add('fade');
                }, 1000);
            }
        });
    });
}

// FILL IN THE BLANK FUNCTIONS
function prepareFillGame() {
    let items = getCurrentData();
    if (!items || items.length === 0) {
        return false;
    }
    
    // Check if data has 'sentence' field for Fill in the Blank game
    const hasSentences = items.some(item => item.sentence && item.answer);
    
    if (!hasSentences) {
        // Try to use term/definition for fill in the blank if no sentences
        items = items.map(item => ({
            sentence: item.definition ? item.definition.replace(item.term, '___') : null,
            answer: item.term || null
        })).filter(item => item.sentence && item.answer);
    }
    
    if (items.length === 0) {
        return false;
    }
    
    // Get random items and prepare options
    const shuffled = shuffleArray(items);
    gameState.currentFillSentences = shuffled.slice(0, Math.min(5, shuffled.length));
    gameState.currentFillOptions = gameState.currentFillSentences.map(item => item.answer);
    gameState.currentSentenceIndex = 0;
    gameState.filledBlanks = [];
    
    return true;
}

function renderFillSentence() {
    const sentenceContainer = document.getElementById('fillSentence');
    const optionsContainer = document.getElementById('fillOptions');
    
    if (gameState.currentFillSentences.length === 0) {
        sentenceContainer.innerHTML = '<div class="no-data">No sentences available for this category</div>';
        optionsContainer.innerHTML = '';
        return;
    }
    
    const currentSentence = gameState.currentFillSentences[gameState.currentSentenceIndex];
    
    // Create sentence with blank
    let sentenceHTML = '';
    if (currentSentence.sentence.includes('___')) {
        const parts = currentSentence.sentence.split('___');
        sentenceHTML = parts[0] + '<span class="fill-blank" id="currentBlank">_____</span>' + parts[1];
    } else {
        // Replace the answer word with a blank if not using ___ format
        const regex = new RegExp(`\\b${currentSentence.answer}\\b`, 'i');
        sentenceHTML = currentSentence.sentence.replace(regex, '<span class="fill-blank" id="currentBlank">_____</span>');
    }
    
    sentenceContainer.innerHTML = sentenceHTML;
    
    // Render options
    optionsContainer.innerHTML = '';
    const shuffledOptions = shuffleArray([...gameState.currentFillOptions]);
    
    shuffledOptions.forEach(option => {
        const optionDiv = document.createElement('div');
        optionDiv.className = `fill-option ${gameState.filledBlanks.includes(option) ? 'used' : ''}`;
        optionDiv.setAttribute('data-option', option);
        optionDiv.textContent = option;
        optionsContainer.appendChild(optionDiv);
        
        // Add event listener if not already used
        if (!gameState.filledBlanks.includes(option)) {
            optionDiv.addEventListener('click', () => {
                gameState.selectedOption = option;
                
                // Mark all options as not selected first
                document.querySelectorAll('.fill-option:not(.used)').forEach(o => {
                    o.classList.remove('selected');
                });
                
                // Mark this one as selected
                optionDiv.classList.add('selected');
                
                // Add hover effect to blank
                document.getElementById('currentBlank').classList.add('hover');
                
                // Update instruction
                document.getElementById('instruction').textContent = "Click the blank to fill it with your selected option";
                document.getElementById('instruction').classList.remove('fade');
                
                // Add click handler to blank
                document.getElementById('currentBlank').addEventListener('click', fillInBlank);
            });
        }
    });
}

function fillInBlank() {
    if (!gameState.selectedOption) {
        showFeedbackTooltip("Please select an option first", true);
        return;
    }
    
    const currentBlank = document.getElementById('currentBlank');
    const currentSentence = gameState.currentFillSentences[gameState.currentSentenceIndex];
    
    // Check if answer is correct
    if (gameState.selectedOption === currentSentence.answer) {
        currentBlank.textContent = gameState.selectedOption;
        currentBlank.classList.add('filled');
        currentBlank.classList.remove('hover');
        
        // Mark the option as used
        document.querySelector(`.fill-option[data-option="${gameState.selectedOption}"]`).classList.add('used');
        
        gameState.filledBlanks.push(gameState.selectedOption);
        gameState.score += 10;
        updateScore(gameState.score);
        
        showFeedbackTooltip("Correct! +10 points");
        
        // Move to next sentence or end game
        setTimeout(() => {
            if (gameState.currentSentenceIndex < gameState.currentFillSentences.length - 1) {
                gameState.currentSentenceIndex++;
                gameState.selectedOption = null;
                renderFillSentence();
            } else {
                endGame(true);
            }
        }, 1000);
    } else {
        currentBlank.classList.add('wrong');
        
        gameState.score = Math.max(0, gameState.score - 5);
        updateScore(gameState.score);
        
        showFeedbackTooltip("Incorrect! -5 points", true);
        
        setTimeout(() => {
            currentBlank.classList.remove('wrong', 'hover');
            document.querySelector(`.fill-option.selected`).classList.remove('selected');
            gameState.selectedOption = null;
            
            document.getElementById('instruction').textContent = "Select the correct option to fill in the blank";
            document.getElementById('instruction').classList.add('fade');
        }, 1000);
    }
    
    // Remove click handler
    currentBlank.removeEventListener('click', fillInBlank);
}

// COMMON GAME FUNCTIONS
function startGame() {
    // Reset game state
    gameState.matchedPairs = [];
    gameState.score = 0;
    gameState.timeLeft = 300;
    gameState.attempts = 0;
    gameState.selectedTerm = null;
    
    updateScore(0);
    
    // Clear any existing timer
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    if (currentGame === 'matching') {
        document.getElementById('instruction').textContent = "Select a term and match it with its correct definition";
        getRandomTerms();
        renderMatchingGame();
    } else if (currentGame === 'filling') {
        document.getElementById('instruction').textContent = "Select the correct option to fill in the blank";
        if (!prepareFillGame()) {
            document.getElementById('fillSentence').innerHTML = 
                '<div class="no-data">No suitable content found for Fill in the Blank game in this category</div>';
            document.getElementById('fillOptions').innerHTML = '';
            return;
        }
        renderFillSentence();
    }
    
    // Start timer
    document.getElementById('timer').textContent = gameState.timeLeft;
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        document.getElementById('timer').textContent = gameState.timeLeft;
        
        if (gameState.timeLeft <= 0) {
            endGame(false);
        }
    }, 1000);
}

function updateScore(newScore) {
    const scoreElement = document.getElementById('score');
    scoreElement.textContent = newScore;
    scoreElement.classList.add('score-animation');
    
    setTimeout(() => {
        scoreElement.classList.remove('score-animation');
    }, 500);
}

function endGame(completed) {
    // Stop timer
    clearInterval(gameState.timer);
    
    // Show final score and message
    let message;
    if (completed) {
        message = `Congratulations! You completed the game with ${gameState.score} points.`;
    } else {
        message = `Time's up! Your final score is ${gameState.score} points.`;
    }
    
    swal({
        title: "Game Over",
        text: message,
        icon: completed ? "success" : "info",
        buttons: {
            retry: {
                text: "Play Again",
                value: "retry",
            },
        },
    }).then((value) => {
        if (value === "retry") {
            startGame();
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initUI);