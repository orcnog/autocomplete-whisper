# autocomplete-whisper
Foundry VTT module to enhance chat whisper targeting with typeahead suggestions and popup menu of available targets.

* Detects when whisper syntax is typed, and provides a popup menu of available whisper targets.
* Provides typeahead suggestions as you type a target's name.  Pres TAB to autocomplete.
* Supports all known whisper syntaxes: "/whisper", "/w ", and "@".
* Supports group whisper syntaxes: "@\[target1, target2\]", "/w \[target1, target2\]" etc.

### Demo
![Demo of autocomplete-whisper module](demo/autocomplete-whisper-demo.gif)

### Release Notes

#### v0.1.0
Original release. Module approved!

#### v0.1.1
Fixes issue #12 - post-whisper ']' brackets triggering unwanted keydown handler

#### v0.1.2
Fixes issue #11, if "Players" targeted in array the menu now hides all indiv players
* This fixes issue #11 - player name with space(s) in it not being removed from context menu after it is chosen.
* Also aims to add intelligent feature to remove all player targets if "Players" was already targeted in the array, and same for GM targets if "GM" or "DM" was already targeted. It's edge-casey, but it felt weird targeting "Players" and then having this script offer up everyone's name still as a possible target.

#### v0.2.0
Navigate up/down the player menu with the arrow keys!
* Now, when you type `/w ` and the player menu pops up, you can press the [up] or [down] key to traverse the context menu, and press [enter] to make a selection.  Great care was taken to allow the original keydown handler to continue to function correctly.
* Compatibility Note: this unbinds and rewrite the original FVTT keydown handler for chat textarea. The new handler is namespaced as `keydown.menufocus`.
* Arrow Keys Demo:  
![Demo of autocomplete-whisper module](demo/arrow-keys-demo.gif)

#### v0.3.0
Removes support for '@' syntax
* The whisper syntax of `@username ` has been deprecated in Foundry v0.7.X, so regex detection of this whisper syntax has now been removed from the module.
* A settings option has been added: You can now control whether a list of GM usernames (i.e. actual names af users assigned a Gamemaster role) appears in the pop-up menu of selectable whisper targets.  The default value is false, and this will probably only apply rarely -- only for games in which there are multiple users with the GM role, and a player wishes to be able to whisper to one, but not all of them.

#### v0.3.1
Updated latest tested compatible version number to remove that pesky "compatibility risk" tag in setup.

#### v0.3.2
Updated latest tested compatible version number to remove that pesky "compatibility risk" tag in setup.
#### v0.3.3
Updated latest tested compatible version number to remove that pesky "compatibility risk" tag in setup. Sigh.