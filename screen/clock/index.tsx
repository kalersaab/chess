import { StyleSheet, Text, View } from "react-native";
import { ClockProps } from "../../interface";
import { CLOCK_HEIGHT, formatTime } from "../../utils";

const Clock = ({ label, seconds, isActive, isLow }: ClockProps) =>{
  return (
    <View style={[styles.clockBox, isActive && styles.clockBoxActive]}>
      <View style={styles.clockInner}>
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
      </View>
    </View>
  );
}
export default Clock;
const styles = StyleSheet.create({
  clockBox: {
    height: CLOCK_HEIGHT,
    width: '100%',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  clockBoxActive: {},
  clockInner: {
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#c9a84c',
  },
  clockText: {
    color: '#ccc',
    fontSize: 28,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  clockTextActive: {
    color: '#f0d9b5',
  },
  clockTextLow: {
    color: '#e74c3c',
  },

})
