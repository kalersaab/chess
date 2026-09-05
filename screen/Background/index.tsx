import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { BoardColorConfig } from '../BoardColor'

interface RowProps{
    row: number
    colors: BoardColorConfig
}
interface SquareProps extends RowProps{
    col: number
}
const Square = ({row, col, colors}:SquareProps) => {
    const offset = row % 2 === 0 ? 1 : 0;
    const isLight = (col +offset) % 2 === 0;
    const backgroundColor = isLight ? colors.darkColor : colors.lightColor;
    const textColor = isLight ? colors.lightColor : colors.darkColor;
    return(
        <View style={{flex:1, backgroundColor, padding:4, justifyContent:'space-between'}}>
            <Text style={{color: textColor, fontWeight:"500", opacity:col ===0 ? 1: 0}}>{8-row}</Text>
            <Text style={{color: textColor, fontWeight:"500", alignSelf:"flex-end",opacity:row ===7 ? 1: 0}}>{String.fromCharCode('a'.charCodeAt(0) + col)}</Text>
        </View>
    )
}
const Row = ({row, colors}:RowProps) => {
return (
<View style={{flex:1,flexDirection:'row'}} >
{
    new Array(8).fill(0).map((_,col)=>(<Square key={col} col={col} row={row} colors={colors}/>))
}
    </View>
)
}

interface BackgroundProps {
  colors?: BoardColorConfig
}

const Background = ({ colors }: BackgroundProps) => {
  const defaultColors: BoardColorConfig = {
    lightColor: '#f0d9b5',
    darkColor: '#b58863',
    highlightColor: '#baca44',
    accentColor: '#c9a84c',
  }
  
  const boardColors = colors || defaultColors;

  return (
    <View style={{flex:1, flexDirection:'column'}}>
      {
        new Array(8).fill(0).map((_,row)=>(<Row key={row} row={row} colors={boardColors} />))
      }
    </View>
  )
}

export default Background
