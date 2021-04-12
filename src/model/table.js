import { addMovesToTable } from '../engine/engine';

export const getInitialTable = () => {
  const table = [];

  // create 8 rows
  for (let i = 0; i < 8; i += 1) {
    table[i] = [];
  }

  //make blank cells blank
  for (let j = 2; j < 6; j += 1) {
    for (let i = 0; i < 8; i += 1) {
      table[i][j] = [0, 0, 0, false, false]
    }
  }

  for (let i = 0; i < 8; i++) { //row of white pawns

    table[i][1] = [2, 1, 0, false, false] //,pawnCanMove]
  }
  for (let i = 0; i < 8; i++) { //row of black pawns
    table[i][6] = [1, 1, 0, false, false] //,pawnCanMove]
  }

  table[0][0] = [2, 4, 0, true, false] //,rookCanMove]				//rooks		//0 stands for times it moved
  table[7][0] = [2, 4, 0, true, false] //,rookCanMove]
  table[0][7] = [1, 4, 0, true, false] //,rookCanMove]
  table[7][7] = [1, 4, 0, true, false] //,rookCanMove]

  table[1][0] = [2, 3, 0, true, false] //,horseCanMove]					//knights
  table[6][0] = [2, 3, 0, true, false] //,horseCanMove]
  table[1][7] = [1, 3, 0, true, false] //,horseCanMove]
  table[6][7] = [1, 3, 0, true, false] //,horseCanMove]

  table[2][0] = [2, 2, 0, true, false] //,bishopCanMove]				//bishops
  table[5][0] = [2, 2, 0, true, false] //,bishopCanMove]
  table[2][7] = [1, 2, 0, true, false] //,bishopCanMove]
  table[5][7] = [1, 2, 0, true, false] //,bishopCanMove]

  table[3][0] = [2, 5, 0, true, false] //,queenCanMove]				//w queen
  table[4][0] = [2, 9, 0, true, false] //,kingCanMove]				//w king

  table[3][7] = [1, 5, 0, true, false] //,queenCanMove]				//b q
  table[4][7] = [1, 9, 0, true, false] //,kingCanMove]				//b k

  // table = addMovesToTable(table, true)

  return addMovesToTable(table, true);
  // table;
};
