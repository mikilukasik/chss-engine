import { getInitialTable } from "./table";

export class GameModel {
  constructor() {
    this.moveCount = 0

    this.pendingMoveCount = 0
    this.desiredDepth = 0	//will set after creating, at each move step
    this.returnedMoves = []

    // this._id = _id,
    //   this.wName = wName,
    //   this.bName = bName,


    //   this.aiToMove = false //unused
    // this.toBeChecked = true //unused
    this.gameIsOn = true
    this.whiteWon = false
    this.blackWon = false
    this.isDraw = false

    this.askWhiteDraw = false
    this.askBlackDraw = false

    this.whiteCanForceDraw = false
    this.blackCanForceDraw = false


    // this.learner = false
    // this.learnerIsBusy = false



    this.wNext = true;
      // this.aiOn = false;
      // this.chat = [];
      this.moves = [];
      // this.pollNum = 1;
      this.allPastTables = []

    this.created = Date.now();
    this.moved = null

    this.table = getInitialTable();

    // this.table = new Array(8) //create 8x8 array
    // for (var i = 0; i < 8; i++) {
    //   this.table[i] = new Array(8)
    // }

    // for (var j = 2; j < 6; j++) { //make the blanks blank
    //   for (i = 0; i < 8; i++) {
    //     this.table[i][j] = [0, 0, 0, false, false]
    //   }
    // }

    // for (var i = 0; i < 8; i++) { //row of white pawns

    //   this.table[i][1] = [2, 1, 0, false, false] //,pawnCanMove]
    // }
    // for (var i = 0; i < 8; i++) { //row of black pawns
    //   this.table[i][6] = [1, 1, 0, false, false] //,pawnCanMove]
    // }

    // this.table[0][0] = [2, 4, 0, true, false] //,rookCanMove]				//rooks		//0 stands for times it moved
    // this.table[7][0] = [2, 4, 0, true, false] //,rookCanMove]
    // this.table[0][7] = [1, 4, 0, true, false] //,rookCanMove]
    // this.table[7][7] = [1, 4, 0, true, false] //,rookCanMove]

    // this.table[1][0] = [2, 3, 0, true, false] //,horseCanMove]					//knights
    // this.table[6][0] = [2, 3, 0, true, false] //,horseCanMove]
    // this.table[1][7] = [1, 3, 0, true, false] //,horseCanMove]
    // this.table[6][7] = [1, 3, 0, true, false] //,horseCanMove]

    // this.table[2][0] = [2, 2, 0, true, false] //,bishopCanMove]				//bishops
    // this.table[5][0] = [2, 2, 0, true, false] //,bishopCanMove]
    // this.table[2][7] = [1, 2, 0, true, false] //,bishopCanMove]
    // this.table[5][7] = [1, 2, 0, true, false] //,bishopCanMove]

    // this.table[3][0] = [2, 5, 0, true, false] //,queenCanMove]				//w queen
    // this.table[4][0] = [2, 9, 0, true, false] //,kingCanMove]				//w king

    // this.table[3][7] = [1, 5, 0, true, false] //,queenCanMove]				//b q
    // this.table[4][7] = [1, 9, 0, true, false] //,kingCanMove]				//b k

    // this.table = addMovesToTable(this.table, true)
    //protectPieces(this.table,true)
    //protectPieces(this.table,false)
  }
}