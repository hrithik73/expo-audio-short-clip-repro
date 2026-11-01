# expo-audio short clip repro (Android)

Minimal reproduction: on Android, the first `play()` of a short clip that has sat loaded for a few seconds is silent. The player still reports that it played (`didJustFinish` fires and `currentTime` reaches the duration). Later plays are audible. iOS is not affected.

- expo 58.0.22, expo-audio 58.0.11, react-native 0.88.1 (Media3 1.9.1)
- Reproduced on a Google Pixel 7, Android 17 (API 37)

## Run

```sh
npm install
npx expo run:android --variant release
```

## Steps

1. Open the app and wait about 3 seconds. Both players are created on mount.
2. Tap **Play short clip (0.2 s)**. You hear nothing, but the on-screen log still shows `didJustFinish`.
3. Tap it again. It is audible from now on.
4. Control: **Play long clip (1.0 s)** is audible on its first play.
5. **Recreate players** puts both back in the first-play state.

`App.tsx` is the whole repro. The clips in `assets/` are generated sine tones.

## What Android's audio log shows

`adb shell dumpsys audio`, playback activity section, for one run:

```
16:55:33.031 new player piid:6039 (short clip)   <- AudioTrack created while the player is paused after load
16:55:34.039 player piid:6039 event:stopped      <- stopped ~1 s later, before any play()
             first play() at 16:55:46.7          <- no "started" event: silent
16:55:47.513 player piid:6063 event:started      <- second play(): new AudioTrack, audible

16:55:33.047 new player piid:6047 (long clip)    <- never stopped while paused
16:55:51.686 player piid:6047 event:started      <- first play() audible
```

## Likely cause (Media3)

A clip that fits entirely in the AudioTrack buffer reaches output end of stream while the player is paused. `MediaCodecAudioRenderer` then calls `DefaultAudioSink.playToEndOfStream()` → `playPendingData()` → `AudioOutput.stop()`, without checking whether playback ever started. A stream-mode AudioTrack that is stopped before it is ever played does not output the data written to it. Media3 sizes the PCM buffer between 0.25 and 0.75 s depending on the device, so the length cutoff varies by device.

## Workaround

On Android, play each short clip once at volume 0 right after it loads, then restore the volume. This uses up the silent first play.
