# autocomplete-whisper
Foundry VTT module to enhance chat whisper targeting with typeahead suggestions and popup menu of available targets.

* Detects when whisper syntax is typed, and provides a popup menu of available whisper targets.
* Provides typeahead suggestions as you type a target's name.  Pres TAB to autocomplete.
* Supports all known whisper syntaxes: "/whisper", "/w ", and "@".
* Supports group whisper syntaxes: "@\[target1, target2\]", "/w \[target1, target2\]" etc.

### Demo
[![Demo of autocomplete-whisper module](demo.gif)](https://youtu.be/gMwCbr0dBUY)

### Release Notes

#### v0.1.0
Original release. Module approved!

#### v0.1.1
Fixes issue #12 - post-whisper ']' brackets triggering unwanted keydown handler
