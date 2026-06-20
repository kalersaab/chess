import { StyleSheet, Text, View } from "react-native";
import { ClockProps } from "../../interface";
import { CLOCK_HEIGHT, formatTime } from "../../utils";

const Clock = ({ label, seconds, isActive, isLow }: ClockProps) =>{
  return (
    <View style={[styles.clockBox, isActive && styles.clockBoxActive]}>
      <View style={styles.clockInner}>
        <View style={styles.clockDot}>
          <View style={[styles.colorDot, label === 'White' ? styles.colorDotWhite : styles.colorDotBlack]} />
        </View>
        <View style={styles.clockTextGroup}>
          <Text style={[styles.clockLabel, isActive && styles.clockLabelActive]}>{label}</Text>
          <Text
            style={[
              styles.clockText,
              isActive && styles.clockTextActive,
              isLow && styles.clockTextLow,
            ]}
          >
            {formatTime(seconds)}
          </Text>
        </View>
        {isActive && <View style={styles.activeIndicator} />}
      </View>
    </View>
  );
}
export default Clock;
const styles = StyleSheet.create({
    clockBox: {
    height: CLOCK_HEIGHT,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: '#2b2a27',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3a3936',
  },
  clockBoxActive: {
    backgroundColor: '#f0d9b5',
    borderColor: '#c9a84c',
  },
  clockInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockDot: {
    marginRight: 12,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  colorDotWhite: {
    backgroundColor: '#ffffff',
    borderColor: '#aaa',
  },
  colorDotBlack: {
    backgroundColor: '#1a1a1a',
    borderColor: '#555',
  },
  clockTextGroup: {
    flex: 1,
  },
  clockLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  clockLabelActive: {
    color: '#6b4f1a',
  },
  clockText: {
    color: '#ccc',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  clockTextActive: {
    color: '#1a1a1a',
  },
  clockTextLow: {
    color: '#e74c3c',
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#c9a84c',
  },
})
