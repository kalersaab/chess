import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
const White = 'rgba(255, 255, 255, 1)';
const Black = 'rgba(37, 112, 22, 1)';
interface RowProps{
    row: number
}
interface SquareProps extends RowProps{
    col: number
}
const Square = ({row, col}:SquareProps) => {
    const offset = row % 2 === 0 ? 1 : 0;
    const backgroundColor = (col +offset) % 2 === 0 ? White : Black;
    const color = (col +offset) % 2 === 0 ? Black : White;
    return(
        <View style={{flex:1, backgroundColor, padding:4, justifyContent:'space-between'}}>
            <Text style={{color, fontWeight:"500", opacity:col ===0?1:0}}>{8-row}</Text>
            <Text style={{color, fontWeight:"500", alignSelf:"flex-end",opacity:row ===7?1:0}}>{String.fromCharCode('a'.charCodeAt(0) + col)}</Text>
        </View>
    )
}
const Row = ({row}:RowProps) => {
return (
<View style={{flex:1,flexDirection:'row'}} >
{
    new Array(8).fill(0).map((_,col)=>(<Square key={col} col={col} row={row}/>))
}
    </View>
)
}
const Background = () => {
  return (
    <View style={{flex:1, flexDirection:'column'}}>
      {
        new Array(8).fill(0).map((_,row)=>(<Row key={row} row={row} />))
      }
    </View>
  )
}

export default Background

const styles = StyleSheet.create({})