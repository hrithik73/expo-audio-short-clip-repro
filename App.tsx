import { useEffect, useRef, useState } from 'react'
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AudioPlayer, createAudioPlayer } from 'expo-audio'

// Repro: on Android, the first play() of a short clip that has sat loaded for a few seconds is silent.
const CLIPS = {
  short: { label: 'Short clip (0.2 s)', source: require('./assets/beep-200ms.wav') },
  long: { label: 'Long clip (1.0 s, control)', source: require('./assets/beep-1s.wav') }
}
type ClipKey = keyof typeof CLIPS

export default function App() {
  const players = useRef<Partial<Record<ClipKey, AudioPlayer>>>({})
  const playCounts = useRef<Record<ClipKey, number>>({ short: 0, long: 0 })
  const [log, setLog] = useState<string[]>([])
  const add = (line: string) => setLog((prev) => [`${new Date().toISOString().slice(11, 23)}  ${line}`, ...prev])

  const createPlayers = () => {
    Object.values(players.current).forEach((p) => p?.remove())
    playCounts.current = { short: 0, long: 0 }
    ;(Object.keys(CLIPS) as ClipKey[]).forEach((key) => {
      const player = createAudioPlayer(CLIPS[key].source)
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) add(`${key}: didJustFinish (currentTime ${status.currentTime.toFixed(3)} s)`)
      })
      players.current[key] = player
    })
    add('Players created. Wait ~3 s before the first play.')
  }

  useEffect(() => {
    createPlayers()
    return () => Object.values(players.current).forEach((p) => p?.remove())
  }, [])

  const play = (key: ClipKey) => {
    const player = players.current[key]
    if (!player) return
    playCounts.current[key] += 1
    player.seekTo(0).then(() => {
      player.play()
      add(`${key}: play #${playCounts.current[key]} (duration ${player.duration.toFixed(3)} s)`)
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>expo-audio short clip repro</Text>
      <Text style={styles.steps}>
        1. Open the app and wait ~3 seconds.{'\n'}
        2. Tap "Play short clip": no sound on Android, though didJustFinish fires.{'\n'}
        3. Tap it again: audible from now on.{'\n'}
        The 1.0 s control clip is audible on its first play.{'\n'}
        "Recreate players" resets both to the first-play state.
      </Text>
      <View style={styles.buttons}>
        <Button title="Play short clip (0.2 s)" onPress={() => play('short')} />
        <Button title="Play long clip (1.0 s)" onPress={() => play('long')} />
        <Button title="Recreate players" onPress={createPlayers} />
      </View>
      <ScrollView style={styles.log}>
        {log.map((line, i) => (
          <Text key={i} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 64, paddingHorizontal: 16, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  steps: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  buttons: { gap: 12, marginBottom: 16 },
  log: { flex: 1 },
  logLine: { fontFamily: 'monospace', fontSize: 12, marginBottom: 4 }
})
