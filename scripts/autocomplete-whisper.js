Hooks.on('renderSidebarTab', (app, html, data) => {
  if (app.tabName !== "chat") {
    return;
  }

  // This is the all-important whisper syntax matcher.
  // It must match any of the following examples:
  //
  // '@' or '/w ' or '/whisper ' or '/wHiSpEr ' (case-insensitive)
  //
  // Note: i'm using '@' to represent any of the above syntaxes (like '/w') from here on in this comment.
  // '@[' (match the start of an Arrays of targets)
  //
  // '@[someName,' (an array with any name(s) followed by a comma)
  //
  // BUT NOT!...
  // '@someName ' or '@someName,' or '@someName, ' (stop matching after a non-array whisper target is complete)
  // '@[someName, otherName] hello,' (stop matching if whisper target is complete)
  //
  // For reference, here's foundry.js's whisperPattern, which does not actually meet all our needs...
  // new RegExp(/^(@|\/w(?:hisper)?\s{1})(\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i');
  //
  // Note: the Regex pattern below uses a Positive Lookbehind, (?<=\[), which may not be supported in obscure or old browsers.
  const whisperPattern = new RegExp(/^(@(?!\s)(?:\[\s*)?|\/w(?:hisper)?\s{1}(?:\[\s*)?)((?<=\[)(?:\s*[^,\]]+,\s*)+)?/, "i");
  // when the above regex pattern is used in a split(), define the parts' by array index...
  const whisperSyntaxIndex = 1;
  const targetsInArrayIndex = 2;

  // match if the input represents a list (array) of targets
  const listOfNamesRegex = new RegExp(/^(@(?!\s)\[\s*|\/w(?:hisper)?\s{1}\[\s*)((?:[^,\]]+,\s*)+)/, "i");

  // some string constants
  const PLAYERS = "Players";
  const GM = "GM";

  /* Set up markup for our UI to be injected */
  const $whisperMenuContainer = $('<div id="whisper-menu"></div>');
  const $ghostTextarea = $('<textarea class="chatghosttextarea" autocomplete="off" readonly disabled></textarea>');
  let $whisperMenu = $('<nav id="context-menu" class="expand-up"><ol class="context-items"></ol></nav>');

  /* Add our UI to the DOM */
  $("#chat-message").after($ghostTextarea);
  $("#chat-message").after($whisperMenuContainer);
  /* Listen for chat input. Do stuff.*/
  $("#chat-message").on("input.whisperer", handleChatInput);
  /* Listen for "]" to close an array of targets (names) */
  $("#chat-message").on("keydown.closearray", listFinishHandler);
  /* Listen for click on a menu item */
  $("#whisper-menu").on("click", "li", menuItemClickHandler);

  function handleChatInput() {
    resetGhostText();
    const val = $("#chat-message").val();
    if (val.match(whisperPattern)) {
      let splt = val.split(whisperPattern);
      // console.log(splt);
      let input = splt[splt.length - 1]; // newly typed input
      let alreadyTargeted = getAlreadyTargeted(splt[targetsInArrayIndex]);
      const activePlayers = game.users.entities.filter(p => p.role !== 4 && p.name);
      let whisperablePlayers = activePlayers.map((p) => p.name);
      whisperablePlayers.push(PLAYERS);
      whisperablePlayers.push(GM);
      let matchingPlayers = whisperablePlayers.filter((target) => {
        const p = target.toUpperCase();
        const i = input.toUpperCase();
        return p.indexOf(i) >= 0 && p !== i && !alreadyTargeted.includes(p);
      });
      if (matchingPlayers.length > 0) {
        let listOfPlayers = "";
        // show ghost text to autocomplete if there's a match starting with the characters already typed
        ghostText(input, matchingPlayers);
        // set up and display the menu of whisperable names
        for (let p in matchingPlayers) {
          if (isNaN(p)) continue;
          const name = matchingPlayers[p];
          let nameHtml = name;
          let startIndex = name.toUpperCase().indexOf(input.toUpperCase());
          if (input && startIndex > -1) {
            nameHtml = name.substr(0, startIndex) + "<strong>" + name.substr(startIndex, input.length) + "</strong>" + name.substr(startIndex + input.length);
          }
          listOfPlayers += `<li class="context-item" data-name="${name}"><i class="fas fa-male fa-fw"></i>${nameHtml}</li>`;
        }
        $whisperMenu.find("ol").html(listOfPlayers);
        $("#whisper-menu").html($whisperMenu);

        // set up click-outside listener to close menu
        $(window).on("click.outsidewhispermenu", (e) => {
          var $target = $(e.target);
          if (!$target.closest("#whisper-menu").length) {
            closeWhisperMenu();
          }
        });
      } else {
        closeWhisperMenu();
      }
    } else {
      closeWhisperMenu();
    }
  }

  function listFinishHandler(e) {
    if (e.which == 221) {
      // `]`
      let val = $("#chat-message").val();
      if (val.match(listOfNamesRegex)) {
        if (typeof e === "object") e.preventDefault();
        val = val.trim();
        const newval = val.substring(0, val.length - 1); // remove `,` from the end
        $("#chat-message").val(newval + "] ");
        closeWhisperMenu();
      }
    }
  }

  function menuItemClickHandler(e) {
    e.stopPropagation();
    var autocompleteText = autocomplete($(this).text());
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
      // remove all spaces, capitalize, and split by commas, then remove the last blank item
      arr = names.replace(/\s/g, "").toUpperCase().split(",");
      arr.pop();
    }
    // console.log(arr);
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
        if (e.which == 9) {
          // tab
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

  function autocomplete(match) {
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
    // interesting quirk: if the whisper target has a space in it, the whisper syntax only works if the target name is wrapped in [].
    if (nameToAdd.indexOf(" ") > -1 && !isArrayOfTargets) {
      startingSyntax += "[";
      charactersAfter = "] "; // go ahead and close the array now, since the user probably only intended one target.
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
  }
});
