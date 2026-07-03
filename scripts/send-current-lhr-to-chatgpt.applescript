set projectPath to "/Users/hideo2112/Documents/New project/toybox-fps-arena"
set urlFile to projectPath & "/tmp/current-lhr-url.txt"
set publicUrl to do shell script "cat " & quoted form of urlFile
set messageText to "DonPaChi FPS の現在の公開URLです。" & linefeed & "メイン: " & publicUrl

set the clipboard to messageText
tell application "Safari"
	activate
end tell
delay 0.8
tell application "System Events"
	keystroke "v" using command down
	key code 36
end tell
