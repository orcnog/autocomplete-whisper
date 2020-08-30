Hooks.on("ready", () => {

  // This code runs once core initialization is ready and game data is available.

  // foundry.js's whisperPattern = new RegExp(/^(@|\/w(?:hisper)?\s{1})(\[(?:[^\]]+)\]|(?:[^\s]+))\s+([^]*)/, 'i');
  const whisperPattern = new RegExp(/^(\s*@\s*\[?\s*|\s*\/w(?:hisper)?\s+\[?\s*)((?<=\[)[^\]]*,\s*)?/, "i"); 
  const PLAYERS = 'Players';
  const GM = 'GM';

  (function () {

    const $whisperMenuContainer = $('<div id="whisper-menu"></div>');
    const $ghostTextarea = $(
      '<textarea class="chatghosttextarea" autocomplete="nope" disabled></textarea>'
    );
    let $whisperMenu = $(
      '<nav id="context-menu" class="expand-up"><ol class="context-items"></ol></nav>'
    );
    $("#chat-message").after($ghostTextarea);
    $("#chat-message").after($whisperMenuContainer);

    /* Listen for chat input. Do stuff.*/
    $("#chat-message").on("input.whisperer", (e) => {
      handleChatInput();
    });

    /* Listen for "]" to close an array of targets (names) */
    $("#chat-message").on('keydown.closearray', e => {
      if (e.which == 221) { // `]`
        const arrayOfNamesRegex = new RegExp(/^.*\[.*,\s/, "i"); 
        let val = $("#chat-message").val();
        if (val.match(arrayOfNamesRegex)) {
          e.preventDefault();
          const newval = val.substring(0, val.length - 2); // remove `, ` from the end
          $("#chat-message").val(newval + "] ");
          closeWhisperMenu();
        }
      }
    });
    
    $("#whisper-menu").on("click", "li", function (e) {
      e.stopPropagation();
      var autocompleteText = autocomplete($(this).text());
      $("#chat-message").val(autocompleteText);
      $('#chat-message').focus();
      closeWhisperMenu();
      if ($("#chat-message").val().indexOf('[') > -1) {
        handleChatInput();
      }
    });
        
    function handleChatInput() {
      resetGhostText();
      const val = $("#chat-message").val();
      if (val.match(whisperPattern)) {
        console.log('match');
        let splt = val.split(whisperPattern);
        let str = splt[splt.length - 1];
        const activePlayers = game.users.entities.filter(
          (p) => p.active && p.name
        );
        let whisperablePlayers = activePlayers.map((p) => p.name);
        whisperablePlayers.push(PLAYERS);
        whisperablePlayers.push(GM);
        let matchingPlayers = whisperablePlayers.filter(
          (p) => p.toUpperCase().indexOf(str.toUpperCase()) === 0 && p !== str
        );
        if (matchingPlayers.length > 0) {
          let listOfPlayers = "";
          // show ghost text to autocomplete if there's just one match
          ghostText(matchingPlayers);
          // set up and display the menu of whisperable names
          for (let p in matchingPlayers) {
            if (isNaN(p)) continue;
            const name = matchingPlayers[p];
            listOfPlayers += `<li class="context-item" data-name="${name}"><i class="fas fa-male fa-fw"></i>${name}</li>`;
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
    
    function ghostText(matches) {
      // show ghost text to autocomplete if there's just one match
      if (matches.length === 1) {
        var autocompleteText = autocomplete(matches[0]);
        $(".chatghosttextarea").val(autocompleteText);
        $(".chatghosttextarea").addClass('show');
        $("#chat-message").on('keydown.ghosttab', e => {
          if (e.which == 9) { // tab
            e.preventDefault();
            $("#chat-message").val($(".chatghosttextarea").val());
            resetGhostText();
            $("#chat-message").focus();
            closeWhisperMenu();
            if ($("#chat-message").val().indexOf('[') > -1) {
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
      var arr = $("#chat-message").val().split(whisperPattern);
      var startingSyntax = arr[1];
      var firstNameInArray = arr[2] || '';
      var partialName = arr[arr.length - 1];
      var restOfTheName = match.substr(partialName.length);
      var charactersAfter = startingSyntax.indexOf('[') > -1 ? ', ' : ' ';
      return startingSyntax + firstNameInArray + partialName + restOfTheName + charactersAfter;
    }

    function closeWhisperMenu() {
      $("#whisper-menu").empty();
      $(window).off("click.outsidewhispermenu");
      resetGhostText();
    }
    
    function resetGhostText() {
      $("#chat-message").off("keydown.ghosttab");
      $(".chatghosttextarea").val("").removeClass('show');
    }
  })();

});

Hooks.on('renderSidebarTab', (app, html) => {
});