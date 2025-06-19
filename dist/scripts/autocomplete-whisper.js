
Hooks.on('init', ()=> {
    game.settings.register('autocomplete-whisper', 'includeGMNamesInList', {
        name : 'Include GM Usernames List',
        hint : 'If enabled, the username(s) of any user with the Gamemaster role will appear in the pop-up menu of whisper targets. If disabled, the menu still includes "GM" (which targets all Gamemaster users at once). You probably only need to check this if playing a game with multiple GM roles.',
        scope : 'world',
        config : true,
        type : Boolean,
        default : false
    })
})
Hooks.on('renderSidebarTab', (app, html, data) => {
    if (app.tabName !== "chat") {
        return;
    }

    // This is the all-important whisper syntax matcher.
    // It must match any of the following examples:
    //
    // /w ' or '/whisper ' or '/wHiSpEr ' (case-insensitive)
    //
    // Note: i'm using '/w' to represent any of the above syntaxes (like '/whisper') from here on in this comment.
    // '/w [' (match the start of an Array of targets)
    //
    // '/w [someName,' (an array with any name(s) followed by a comma)
    //
    // BUT NOT!...
    // '/w someName ' or '/w someName,' or '/w someName, ' (i.e. stop matching after a non-array whisper target is complete)
    // '/w [someName, otherName] hello,' (i.e. stop matching if an array whisper target is complete)
    //
    // For reference, here's foundry.js's whisperPattern, which does not actually meet all our needs...
    // new RegExp(/^(\/w(?:hisper)?\s{1})(\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i');
    //
    // Note: the Regex pattern below uses a Positive Lookbehind, (?<=\[), which may not be supported in obscure or old browsers.
    const whisperPattern = new RegExp(/^(\/w(?:hisper)?\s{1}(?:\[)?)((?<=\[)\s*(?:\s*[^,\]]+,\s*)*)?(?!.*\])/, "i");
    // when the above regex pattern is used in a split(), define the parts by array index...
    const whisperSyntaxIndex = 1;
    const targetsInArrayIndex = 2;

    // match if the input represents a list (array) of targets
    const listOfNamesRegex = new RegExp(/^(\/w(?:hisper)?\s{1}\[)((?:\s*[^,\]]+,\s*)+)(?!.*\])/, "i");

    // some string constants
    const PLAYERS = "Players";
    const GM = ["GM", "DM"];

    /* Set up markup for our UI to be injected */
    const $whisperMenuContainer = $('<div id="whisper-menu"></div>');
    const $ghostTextarea = $('<textarea class="chatghosttextarea" autocomplete="off" readonly disabled></textarea>');
    let $whisperMenu = $('<nav id="context-menu" class="expand-up"><ol class="context-items"></ol></nav>');

    /* Add our UI to the DOM */
    $("#chat-message").before($whisperMenuContainer);
    $("#chat-message").after($ghostTextarea);

    /* Unbind original FVTT chat textarea keydown handler and implemnt our own to catch up/down keys first */
    $("#chat-message").off("keydown");
    $("#chat-message").on("keydown.menufocus", jumpToMenuHandler);
    /* Listen for chat input. Do stuff.*/
    $("#chat-message").on("input.whisperer", handleChatInput);
    /* Listen for "]" to close an array of targets (names) */
    $("#chat-message").on("keydown.closearray", closeArrayHandler);
    /* Listen for up/down arrow presses to navigate exposed menu */
    $("#whisper-menu").on("keydown.menufocus", menuNavigationHandler);
    /* Listen for click on a menu item */
    $("#whisper-menu").on("click", "li", menuItemSelectionHandler);

    function handleChatInput() {
        resetGhostText();
        const val = $("#chat-message").val();
        if (val.match(whisperPattern)) {

            // It's a whisper! Show a menu of whisper targets and typeahead text if possible

            let splt = val.split(whisperPattern);
            // console.log(splt);
            let input = splt[splt.length - 1]; // newly typed input
            let alreadyTargeted = getAlreadyTargeted(splt[targetsInArrayIndex]);
            const includeGMNamesInList = game.settings.get('autocomplete-whisper', 'includeGMNamesInList');
            const activePlayers = Array.from(game.users).filter(p => (includeGMNamesInList || !p.isGM) && p.name);
            let whisperablePlayers = activePlayers.map((p) => p.name);
            whisperablePlayers.push(PLAYERS);
            whisperablePlayers.push(GM[0]);
            let matchingPlayers = whisperablePlayers.filter((target) => {
                const p = target.toUpperCase();
                const i = input.toUpperCase();
                return p.indexOf(i) >= 0 && p !== i && !alreadyTargeted.includes(p);
            });
            if (matchingPlayers.length > 0) {

                // At least one potential target exists.
                // show ghost text to autocomplete if there's a match starting with the characters already typed
                ghostText(input, matchingPlayers);

                // Menu
                // set up and display the menu of whisperable names
                let listOfPlayers = "";
                for (let p in matchingPlayers) {
                    if (isNaN(p)) continue;
                    const name = matchingPlayers[p];
                    let nameHtml = name;
                    let startIndex = name.toUpperCase().indexOf(input.toUpperCase());
                    if (input && startIndex > -1) {
                        nameHtml = name.substr(0, startIndex) + "<strong>" + name.substr(startIndex, input.length) + "</strong>" + name.substr(startIndex + input.length);
                    }
                    listOfPlayers += `<li class="context-item" data-name="${name}" tabIndex="0"><i class="fas fa-male fa-fw"></i>${nameHtml}</li>`;
                }
                $whisperMenu.find("ol").html(listOfPlayers);
                $("#whisper-menu").html($whisperMenu);

                // set up click-outside listener to close menu
                $(window).on("click.outsidewhispermenu", (e) => {
                    var $target = $(e.target);
                    if (!$target.closest("#whisper-menu").length) {
                        closeArrayHandler(e);
                        closeWhisperMenu();
                    }
                });

                // set up shift-key listener to ghost an opening "[" when shift is down
                // (if "[" is not already present, and user hasn't begun to type a target name in)
                if (val.indexOf("[") === -1 && alreadyTargeted.length === 0 && input === "") {
                    $("#chat-message, #whisper-menu").on("keydown.shiftdownghost", shiftDownPreSelectHandler);
                    $("#chat-message, #whisper-menu").on("keyup.shiftupghost", shiftUpPreSelectHandler);
                } else {
                    $("#chat-message, #whisper-menu").off("keydown.shiftdownghost");
                    $("#chat-message, #whisper-menu").off("keydown.shiftupghost");
                }
            } else {
                closeWhisperMenu();
            }
        } else {
            closeWhisperMenu();
        }
    }

    function closeArrayHandler(e) {
        if (e.which == 221 || e.type == 'click') { // character typed is `]`, or it's a mouse click
            let val = $("#chat-message").val();
            if (val.match(listOfNamesRegex)) {
                if (typeof e === "object") e.preventDefault();
                val = val.trim();
                const newval = val.substring(val.length - 1) === "," ? val.substring(0, val.length - 1) : val; // remove `,` from the end
                $("#chat-message").val(newval + "] ");
                closeWhisperMenu();
            }
        }
    }

    function jumpToMenuHandler(e) {
        if ($("#whisper-menu").find("li").length) {
            if (e.which === 38) { // `up`
                $("#whisper-menu li:last-child").focus();
                return false;
            } else if (e.which === 40) { // `down`
                $("#whisper-menu li:first-child").focus();
                return false;
            }
        }
        // if player menu is not visible/DNE, execute FVTT's original keydown handler
        ui.chat._onChatKeyDown(e);
    }

    function shiftDownPreSelectHandler(e) {
        if (e.which === 16) { // shift key (left or right) is depressed
            $(".chatghosttextarea").val($("#chat-message").val().trim() + " [");
            $(".chatghosttextarea").addClass("show");
        }
    }

    function shiftUpPreSelectHandler(e) {
        if (e.which === 16) { // shift key (left or right) was released
            $(".chatghosttextarea").removeClass("show");
        }
    }

    function menuNavigationHandler(e) {
        if ($(e.target).is("li.context-item")) {
            if (e.which === 38) { // `up`
                if ($(e.target).is(":first-child")) {
                    $("#chat-message").focus();
                } else {
                    $(e.target).prev().focus();
                }
                return false;
            } else if (e.which === 40) { // `down`
                if ($(e.target).is(":last-child")) {
                    $("#chat-message").focus();
                } else {
                    $(e.target).next().focus();
                }
                return false;
            } else if (e.which === 13) { // `enter`
                menuItemSelectionHandler(e);
                return false;
            }
        }
    }

    function menuItemSelectionHandler(e) {
        e.stopPropagation();
        var autocompleteText = autocomplete($(e.target).text(), e.shiftKey);
        $("#chat-message").val(autocompleteText.overwrite);
        $("#chat-message").focus();
        closeWhisperMenu();
        if ($("#chat-message").val().indexOf("[") > -1) {
            handleChatInput();
        }
    }

    function getAlreadyTargeted(names) {
        let arr = [];
        if (typeof names !== "undefined") {
            // split by commas, then remove the last blank item
            arr = names.toUpperCase().split(",");
            arr.pop();
            arr = arr.map(n => n.trim());
            if (arr.indexOf(PLAYERS.toUpperCase()) >= 0) {
                let allPlayers = Array.from(game.users).filter(u => !u.isGM).map((p) => p.name.toUpperCase());
                arr = arr.concat(allPlayers);
            }
            if (arr.indexOf(GM[0].toUpperCase()) >= 0 || arr.indexOf(GM[1].toUpperCase()) >= 0) {
                let allGMs = Array.from(game.users).filter(u => u.isGM).map((p) => p.name.toUpperCase());
                arr = arr.concat(allGMs, GM);
            }
            // console.log(arr);
        }
        return arr;
    }

    function ghostText(input, matches) {
        // show ghost text to autocomplete if there's a match starting with the characters already typed
        let filteredMatches = matches.filter((target) => {
            const p = target.toUpperCase();
            const i = input.toUpperCase();
            return p.indexOf(i) === 0 && p !== i;
        });
        if (filteredMatches.length === 1) {
            var autocompleteText = autocomplete(filteredMatches[0]);
            $(".chatghosttextarea").val(autocompleteText.ghost);
            $(".chatghosttextarea").addClass("show");
            $("#chat-message").on("keydown.ghosttab", (e) => {
                if (e.which == 9) { // tab
                    e.preventDefault();
                    $("#chat-message").val(autocompleteText.overwrite);
                    resetGhostText();
                    $("#chat-message").focus();
                    closeWhisperMenu();
                    if ($("#chat-message").val().indexOf("[") > -1) {
                        handleChatInput();
                    }
                }
            });
        } else {
            resetGhostText();
        }
    }

    function autocomplete(match, isShiftSelected) {
        if (!match) return;
        const arr = $("#chat-message").val().split(whisperPattern);
        let startingSyntax = arr[whisperSyntaxIndex];
        const targetsAlreadyInArray = arr[targetsInArrayIndex] || "";
        const typedCharacters = arr[arr.length - 1];
        let nameToAdd = '';
        if (match.toUpperCase().indexOf(typedCharacters.toUpperCase()) === 0) {
            var restOfTheName = match.substr(typedCharacters.length);
            nameToAdd = typedCharacters + restOfTheName;
        } else {
            nameToAdd = match;
        }
        const isArrayOfTargets = startingSyntax.indexOf("[") > -1;
        // add a `, ` if this is an array of targets
        let charactersAfter = isArrayOfTargets ? ", " : " ";
        const ghostString = startingSyntax + targetsAlreadyInArray + nameToAdd + charactersAfter;
        // if this is a shift-selection and bracket syntax has't already been implemented in the input area, start it now
        if (isShiftSelected && startingSyntax.indexOf("[") == -1) {
            startingSyntax += "[";
            charactersAfter = ", ";
        }
        // interesting quirk: if the whisper target has a space in it, the whisper syntax only works if the target name
        // is wrapped in []. *shrug* makes sense.
        if (nameToAdd.indexOf(" ") > -1 && !isArrayOfTargets) {
            startingSyntax += "[";
            charactersAfter = "] "; // go ahead and append the closing-bracket to the array now
        }
        const retypeWrappedInBrackets = startingSyntax + targetsAlreadyInArray + nameToAdd + charactersAfter;
        return ({
            ghost: ghostString,
            overwrite: retypeWrappedInBrackets
        });
    }

    function closeWhisperMenu() {
        $("#whisper-menu").empty();
        $(window).off("click.outsidewhispermenu");
        resetGhostText();
    }

    function resetGhostText() {
        $("#chat-message").off("keydown.ghosttab");
        $(".chatghosttextarea").val("").removeClass("show");
        $("#chat-message, #whisper-menu").off("keydown.shiftdownghost");
        $("#chat-message, #whisper-menu").off("keydown.shiftupghost");
    }
});
