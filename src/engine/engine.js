// needed for service
var MoveToSend = function (moveCoord, index, dbTableWithMoveTask, splitMoveId, firstLevelMoveCount) {

  var moveTask = dbTableWithMoveTask.moveTask

  this.shouldIDraw = moveTask.shouldIDraw

  this.firstLevelMoveCount = firstLevelMoveCount

  this.mod = moveTask.mod

  this.moveIndex = index

  this.moveCoords = moveCoord //one move only

  this.sharedData = moveTask.sharedData

  this.sharedData.origTable = dbTableWithMoveTask.table

  this.sharedData.gameNum = dbTableWithMoveTask._id

  this.sharedData.desiredDepth = moveTask.sharedData.desiredDepth

  this.sharedData.splitMoveID = splitMoveId

  this.timer = {}

  this.history = []

}

export const SplitMove = function (dbTableWithMoveTask) {

  //**console.log(JSON.stringify(dbTableWithMoveTask.moveTask))

  this.shouldIDraw = dbTableWithMoveTask.moveTask.shouldIDraw

  this.started = new Date()

  this.splitMoveIndex = undefined

  this.splitMoveID = Math.random() * Math.random()

  var movesToSend = []

  const firstLevelMoveCount = dbTableWithMoveTask.moveTask.moveCoords.length;
  dbTableWithMoveTask.moveTask.moveCoords.forEach((moveCoord, index) => {

    movesToSend.push(new MoveToSend(moveCoord, index, dbTableWithMoveTask, this.splitMoveID, firstLevelMoveCount))

  })

  this.movesToSend = movesToSend //this will get empty as we send the moves out for processing

  this.moves = movesToSend.slice() //this should stay full

  this.thinkers = [] //this will get filled with the clients working on this splitmove

  this.gameNum = dbTableWithMoveTask._id

  this.origTable = dbTableWithMoveTask.table

  this.origMoveTask = dbTableWithMoveTask.moveTask

  this.pendingMoveCount = dbTableWithMoveTask.moveTask.moveCoords.length


  this.movesToSend.forEach(function (splitMove) {

    splitMove.progress = {

      moveCoords: splitMove.moveCoords,
      moveIndex: splitMove.moveIndex,

      done: false,
      result: {},

      expected: undefined,

    }

  })

}

export const MoveTaskN = function (dbTable, mod) {
  this.id = Math.random();

  var shouldIDraw = evalFuncs.shouldIDraw(dbTable)
  this.shouldIDraw = shouldIDraw

  // console.log({shouldIDraw})

  if (mod) this.mod = mod

  this.sharedData = {

    shouldIDraw: shouldIDraw,

    origWNext: dbTable.wNext,

    desiredDepth: dbTable.desiredDepth,
    oppKingPos: whereIsTheKing(dbTable.table, !dbTable.wNext),
    origProtect: protectTable(dbTable.table, dbTable.wNext),
    origData: getTableData(dbTable.table, dbTable.wNext),
    // origDeepDatatt: getHitScores(dbTable.table, true, true, dbTable.wNext,
    //   mod),
    // origDeepDatatf: getHitScores(dbTable.table, true, false, dbTable.wNext,
    //   mod),
    // origDeepDataft: getHitScores(dbTable.table, false, true, dbTable.wNext,
    //   mod),
    // origDeepDataff: getHitScores(dbTable.table, false, false, dbTable.wNext,
    //   mod),
  }

  this.moveCoords = getAllMoves(dbTable.table, dbTable.wNext, false, 0, true)

  var dontLoop = false
  if (this.sharedData.origData[0] > 1) {
    dontLoop = true
  }

  this.sharedData.dontLoop = dontLoop

};

export function addMovesToTable(originalTable, whiteNext, dontClearInvalid, returnMoveCoords) {
  var myCol = whiteNext ? 2 : 1;
  for (var i = 0; i < 8; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      if (originalTable[i][j][0] === myCol) {
        // var returnMoveCoords = [];
        originalTable[i][j][5] = canMove(i, j, whiteNext, originalTable, false, false, [0], dontClearInvalid, returnMoveCoords); //:  canMove(k, l, isWhite, moveTable, speedy, dontProt, hitSumm, dontRemoveInvalid) { //, speedy) {
      } else {
        originalTable[i][j][5] = [];
      }
    }
  }
  return originalTable;
}

export const evalFuncs = {
  getPieceValues: function (dbTable) {

    var result = {
      wVal: 0,
      bVal: 0
    };

    var table = dbTable.table;

    table.forEach(function (x) {
      x.forEach(function (y) {
        switch (y[0]) {
          case 1:

            result.bVal += y[1];

            break;

          case 2:

            result.wVal += y[1];

            break;

          default:
            break;
        }
      });
    });

    return result;

  },

  shouldIDraw: function (dbTable) {
    var pieceVals = this.getPieceValues(dbTable);

    if (dbTable.wNext) {
      if (pieceVals.wVal < pieceVals.bVal) return true;
    } else {
      if (pieceVals.wVal > pieceVals.bVal) return true;
    }

    return false;
  },

  checkIfLooped: function (newTable, allPastTables) {

    var seenCount = 0;
    var thisState = createState(newTable);

    allPastTables.forEach(function (pastTable) {
      if (pastTable === thisState) seenCount += 1;
    });

    return seenCount;

  },
};

function whereIsTheKing(table, wn) {
  var myCol = 1;
  if (wn) myCol += 1; //myCol is 2 when white

  for (var i = 0; i < 8; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      if (table[i][j][1] === 9 && table[i][j][0] === myCol) {
        //itt a kiraly
        return [i, j];
      }
    }
  }
}

function protectTable(table, myCol) {
  return protectPieces(table, myCol) - protectPieces(table, !myCol);
}

function protectPieces(originalTable, whitePlayer) {
  var myCol = 1;
  if (whitePlayer) myCol = 2; //myCol is 2 when white
  var protectedSum = 0;
  getAllMoves(originalTable, whitePlayer, true)
    . //moves include to hit my own 
    //true stands for letMeHitMyOwn

    forEach(function (thisMoveCoords) {
      //we'll use the 2nd part of the moves [2][3]
      if (originalTable[thisMoveCoords[2]][thisMoveCoords[3]][0] === myCol) { //if i have sg there
        originalTable[thisMoveCoords[2]][thisMoveCoords[3]][6] = true; //that must be protected

        if (originalTable[thisMoveCoords[0]][thisMoveCoords[1]][1] === 9) {
          protectedSum += (9 - originalTable[thisMoveCoords[2]][thisMoveCoords[3]][1]) * 2; //king protects double

        } else {

          protectedSum += 9 - originalTable[thisMoveCoords[2]][thisMoveCoords[3]][1];
        }

      }
    });
  return protectedSum;
}

function getAllMoves(tableToMoveOn, whiteNext, hitItsOwn, allHitSum, removeCaptured) { //shouldn't always check hitsum
  var origColor = whiteNext ? 2 : 1;
  var thisArray = [];

  if (hitItsOwn) {
    whiteNext = !whiteNext;
  }
  var hitSumPart = [0];

  for (var lookI = 0; lookI < 8; lookI += 1) { //
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table
      if (tableToMoveOn[lookI][lookJ][0] === origColor) { //ha sajat babum
        canMove(lookI, lookJ, whiteNext, tableToMoveOn, !removeCaptured, true, hitSumPart) //true,true for speedy(sakkba is lep),dontProtect
          .forEach(function (stepItem) {
            thisArray[thisArray.length] = [lookI, lookJ, stepItem[0], stepItem[1]];
          });
      }
    }
  }
  return thisArray;
}
function getTableData(origTable, isWhite, oppKingPos) { //, rtnSimpleValue) {

  var lSancVal = 0;
  var rSancVal = 0;

  var tableValue = 0;

  var rtnMyHitSum = [0]; //this pointer will be passed to canmove 
  var rtnHisHitSum = [0];

  var rtnMyBestHit = 0;
  var rtnHisBestHit = 0;

  var rtnHisMoveCount = 0;

  var rtnPushHimBack = 0;

  var rtnApproachTheKing = 0;

  if (oppKingPos === undefined) oppKingPos = whereIsTheKing(origTable, !isWhite);

  var origColor = 1;
  if (isWhite) origColor = 2;

  if (isWhite && origTable[4][0][3]) { //we play with white and have not moved the king yet

    var sancolhat = false;

    if (origTable[0][0][3]) {
      lSancVal += 3; //unmoved rook worth more than moved
      sancolhat = true;

      if (origTable[3][0][0] === 0) lSancVal += 1; //trying to empty between
      if (origTable[2][0][0] === 0) lSancVal += 3;
      if (origTable[1][0][0] === 0) lSancVal += 1;

      if (origTable[2][1][0] === 2) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[2][1][1] === 1) lSancVal += 4;
      }
      if (origTable[1][1][0] === 2) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[1][1][1] === 1) lSancVal += 4;
      }
      if (origTable[0][1][0] === 2) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[0][1][1] === 1) lSancVal += 4;
      }

    }

    if (origTable[7][0][3]) {
      sancolhat = true;
      rSancVal += 3;

      if (origTable[6][0][0] === 0) rSancVal += 1;
      if (origTable[5][0][0] === 0) rSancVal += 3;

      if (origTable[7][1][0] === 2) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[7][1][1] === 1) rSancVal += 4;
      }
      if (origTable[6][1][0] === 2) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[6][1][1] === 1) rSancVal += 4;
      }
      if (origTable[5][1][0] === 2) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[5][1][1] === 1) rSancVal += 4;
      }

    }

    if (sancolhat) {
      if (origTable[3][1][1] === 1 && origTable[3][1][0] === 2) lSancVal -= 6; //try to move d2 or e2 first
      if (origTable[4][1][1] === 1 && origTable[4][1][0] === 2) rSancVal -= 6;

      if (origTable[2][0][1] === 2 && origTable[2][0][0] === 2) lSancVal -= 6; //try to move out bishops
      if (origTable[5][0][1] === 2 && origTable[5][0][0] === 2) rSancVal -= 6;
    }

  }

  if (!isWhite && origTable[4][7][3]) { //we play with black and have not moved the king yet
    sancolhat = false;

    if (origTable[0][7][3]) {
      sancolhat = true;
      lSancVal += 3; //unmoved rook worth more than moved

      if (origTable[3][7][0] === 0) lSancVal += 1;
      if (origTable[2][7][0] === 0) lSancVal += 3;
      if (origTable[1][7][0] === 0) lSancVal += 1;

      if (origTable[2][6][0] === 1) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[2][6][1] === 1) lSancVal += 4;
      }
      if (origTable[1][6][0] === 1) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[1][6][1] === 1) lSancVal += 4;
      }
      if (origTable[0][6][0] === 1) { //trying to keep my pieces  there to cover
        lSancVal += 1;
        if (origTable[0][6][1] === 1) lSancVal += 4;
      }
    }

    if (origTable[7][7][3]) {
      sancolhat = true;
      rSancVal += 3;

      if (origTable[6][7][0] === 0) rSancVal += 1;
      if (origTable[5][7][0] === 0) rSancVal += 3;

      if (origTable[7][6][0] === 1) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[7][6][1] === 1) rSancVal += 4;
      }
      if (origTable[6][6][0] === 1) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[6][6][1] === 1) rSancVal += 4;
      }
      if (origTable[5][6][0] === 1) { //trying to keep my pieces  there to cover
        rSancVal += 1;
        if (origTable[5][6][1] === 1) rSancVal += 4;
      }

    }
    //	
    if (sancolhat) {
      if (origTable[3][6][1] === 1 && origTable[3][6][0] === 1) lSancVal -= 4;
      if (origTable[4][6][1] === 1 && origTable[4][6][0] === 1) rSancVal -= 4;

      if (origTable[2][7][1] === 2 && origTable[2][7][0] === 1) lSancVal -= 4;
      if (origTable[5][7][1] === 2 && origTable[5][7][0] === 1) rSancVal -= 4;

    }

  }
  var myMostMoved = 0;

  var getToMiddle = 0;
  for (var lookI = 0; lookI < 8; lookI += 1) { //
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table

      if (origTable[lookI][lookJ][0] === origColor) { //ha sajat babum

        //below:	minnel nagyobb erteku babum minnel kozelebb az ellenfel kiralyahoz

        rtnApproachTheKing += ((7 - Math.abs(oppKingPos[0] - lookI)) + (7 - Math.abs(oppKingPos[1] - lookJ))) * origTable[lookI][lookJ][1];

        canMove(lookI, lookJ, isWhite, origTable, true, true, rtnMyHitSum); //this can give back the moves, should use it
        if (origTable[lookI][lookJ][2] > myMostMoved) myMostMoved = origTable[lookI][lookJ][2]; //get the highest number any piece moved

        if (isWhite) {
          rtnPushHimBack += lookJ;
        } else {
          rtnPushHimBack += 7 - lookJ;
        }

        tableValue += origTable[lookI][lookJ][1];

      } else {

        if (!(origTable[lookI][lookJ][0] === 0)) { //ha ellenfele

          rtnHisMoveCount += (canMove(lookI, lookJ, !isWhite, origTable, true, true, rtnHisHitSum)
            .length - 2);
          if (!isWhite) {
            rtnPushHimBack -= lookJ / 10;
          } else {
            rtnPushHimBack -= (7 - lookJ) / 10;
          }
          //or this tblevalue:
          tableValue -= origTable[lookI][lookJ][1];
        }
      }
    }
  }

  return [tableValue, rtnMyHitSum[0], rtnHisHitSum[0], // rtnHisMoveCount, 
    lSancVal, rSancVal, getToMiddle, rtnPushHimBack, myMostMoved, rtnApproachTheKing
  ];

}











// needed for client
function canMove(k, l, isWhite, moveTable, speedy, dontProt, hitSumm = [0], dontRemoveInvalid, returnMoveCoords) { //, speedy) {
  var what = moveTable[k][l][1];
  var possibleMoves = [];
  var scndHitSum = [0];
  switch (what) {
    case 1:
      possibleMoves = pawnCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    case 2:
      possibleMoves = bishopCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    case 3:
      possibleMoves = horseCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    case 4:
      possibleMoves = rookCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    case 5:
      possibleMoves = queenCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    case 9:
      possibleMoves = kingCanMove(k, l, isWhite, moveTable, hitSumm);
      break;
    default:
  }
  if (typeof returnMoveCoords !== 'undefined') { //and not undefined..
    possibleMoves.forEach(function (move) {
      returnMoveCoords[returnMoveCoords.length] = [k, l, move[0], move[1]];
    });
  }
  if (!speedy) { //     lefut.
    for (var i = possibleMoves.length - 1; i >= 0; i -= 1) { //sakkba nem lephetunk
      if (captured(moveIt([k, l, possibleMoves[i][0], possibleMoves[i][1]], moveTable, dontProt), isWhite)) { //sakkba lepnenk
        possibleMoves.splice(i, 1);
      }
    }
    if (what === 9 && moveTable[k][l][3]) { //lesznek sanc lepesek is a possibleMoves tombben: kiraly nem mozdult meg

      if (captured(moveTable, isWhite)) { // de sakkban allunk
        for (var spliceCount = possibleMoves.length - 1; spliceCount >= 0; spliceCount -= 1) {
          if (possibleMoves[spliceCount][1] === l && (possibleMoves[spliceCount][0] === k - 2 || possibleMoves[spliceCount][0] === k + 2)) {
            possibleMoves.splice(spliceCount, 1); //remove
          }
        }
      }
      // remove the sakkot atugrani sem er sanc

      var removeKmin2 = true; //alapbol leszedne
      var removeKplus2 = true;
      for (var i = possibleMoves.length - 1; i >= 0; i -= 1) { //
        if (possibleMoves[i][1] === l && possibleMoves[i][0] === k - 1) removeKmin2 = false; //de ha van koztes lepes, ne szedd le
        if (possibleMoves[i][1] === l && possibleMoves[i][0] === k + 1) removeKplus2 = false;
      }
      for (var i = possibleMoves.length - 1; i >= 0; i -= 1) { //itt szedi le a sanclepeseket
        if (possibleMoves[i][1] === l &&
          ((possibleMoves[i][0] === k - 2 && removeKmin2) ||
            (possibleMoves[i][0] === k + 2 && removeKplus2))) {
          possibleMoves.splice(i, 1);
        }
      }
    }
  }
  return possibleMoves;
}

function pushAidA(hitSummmm, canMoveTo, x, y, fromTable, isWhite, whatHits) {
  const pieceThere = whatsThereNN(x, y, fromTable);
  if (pieceThere[0] === 3) return false;  // off the table, dont go further

  const myCol = isWhite ? 2 : 1;
  const target = fromTable[x][y];
  if (target[0] === myCol) return false; // my piece, can't go there, dont go further

  // opponents piece or empty sqare there, can move there
  canMoveTo[canMoveTo.length] = [x, y, target[1]];
  if (target[0] === 0) return true; // can go further if it was empty space, no hit

  // we found a hit
  var thisHit = target[1]; //normal hivalue
  if (target[6]) thisHit -= whatHits; // protected

  if (hitSummmm[0] < thisHit) hitSummmm[0] = thisHit;
  return false; // can't go further
}

function pushAidP(hitSummmm, canMoveTo, x, y, fromTable, isWhite, whatHits) {
  if (fromTable[x][y][0] === 0) canMoveTo[canMoveTo.length] = [x, y, 0];
}

function pushAidPH(hitSummmm, canMoveTo, x, y, fromTable, isWhite, whatHits) {
  const nc = isWhite ? 1 : 2;
  if (x > 0 && fromTable[x - 1][y][0] === nc) canMoveTo[canMoveTo.length] = [x - 1, y, fromTable[x - 1][y][1]]
  if (x < 7 && fromTable[x + 1][y][0] === nc) canMoveTo[canMoveTo.length] = [x + 1, y, fromTable[x + 1][y][1]]
  if (fromTable[x][y][0] === 0) {
    canMoveTo[canMoveTo.length] = [x, y, 0];
    return true;
  }
}

function rookCanMove(k, l, isWhite, moveTable, hitSummm = [0]) {
  var canMoveTo = [];
  var i = k + 1;
  while (pushAidA(hitSummm, canMoveTo, i, l, moveTable, isWhite, 4)) i += 1;
  i = k - 1;
  while (pushAidA(hitSummm, canMoveTo, i, l, moveTable, isWhite, 4)) i -= 1;
  i = l + 1;
  while (pushAidA(hitSummm, canMoveTo, k, i, moveTable, isWhite, 4)) i += 1;
  i = l - 1;
  while (pushAidA(hitSummm, canMoveTo, k, i, moveTable, isWhite, 4)) i -= 1;
  return canMoveTo;
}

function bishopCanMove(k, l, isWhite, moveTable, hitSummm = [0]) {
  var canMoveTo = [];
  var i = k + 1;
  var j = l + 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 2)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 2)) {
    i -= 1;
    j -= 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 2)) {
    i += 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 2)) {
    i -= 1;
    j += 1;
  }
  return canMoveTo;
}

function queenCanMove(k, l, isWhite, moveTable, hitSummm = [0]) {
  var canMoveTo = [];
  var i = k + 1;
  var j = l + 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 5)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 5)) {
    i -= 1;
    j -= 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 5)) {
    i += 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidA(hitSummm, canMoveTo, i, j, moveTable, isWhite, 5)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  while (pushAidA(hitSummm, canMoveTo, i, l, moveTable, isWhite, 5)) i += 1;
  i = k - 1;
  while (pushAidA(hitSummm, canMoveTo, i, l, moveTable, isWhite, 5)) i -= 1;
  i = l + 1;
  while (pushAidA(hitSummm, canMoveTo, k, i, moveTable, isWhite, 5)) i += 1;
  i = l - 1;
  while (pushAidA(hitSummm, canMoveTo, k, i, moveTable, isWhite, 5)) i -= 1;
  return canMoveTo;
}

function pawnCanMove(k, l, isWhite, moveTable, hitSummm) {
  var canMoveTo = [];
  if (isWhite) {
    if (pushAidPH(hitSummm, canMoveTo, k, l + 1, moveTable, true, 1) && l === 1) {
      pushAidP(hitSummm, canMoveTo, k, l + 2, moveTable, true, 1);
    }
    //en pass
    if (k > 0 && moveTable[k - 1][l][3]) {
      pushAidA(hitSummm, canMoveTo, k - 1, l + 1, moveTable, true, 1);
    }
    if (k < 7 && moveTable[k + 1][l][3]) {
      pushAidA(hitSummm, canMoveTo, k + 1, l + 1, moveTable, true, 1);
    }
    return canMoveTo;
  }
  if (pushAidPH(hitSummm, canMoveTo, k, l - 1, moveTable, false, 1) && l === 6) {
    pushAidP(hitSummm, canMoveTo, k, l - 2, moveTable, false, 1);
  }
  //en pass
  if (k > 0 && moveTable[k - 1][l][3]) {
    pushAidA(hitSummm, canMoveTo, k - 1, l - 1, moveTable, false, 1);
  }
  if (k < 7 && moveTable[k + 1][l][3]) {
    pushAidA(hitSummm, canMoveTo, k + 1, l - 1, moveTable, false, 1);
  }
  return canMoveTo;
}

function kingCanMove(k, l, isWhite, moveTable, hitSummm) {
  var canMoveTo = [];
  pushAidA(hitSummm, canMoveTo, k + 1, l + 1, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k - 1, l + 1, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k + 1, l - 1, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k - 1, l - 1, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k + 1, l, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k - 1, l, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k, l + 1, moveTable, isWhite, 9);
  pushAidA(hitSummm, canMoveTo, k, l - 1, moveTable, isWhite, 9);
  //sanc
  if (moveTable[k][l][3]) { //if the king hasnt moved yet, 
    // !!!TODO!!!: ha nincs sakkban, nem is ugrik at sakkot

    if (moveTable[0][l][3] && // unmoved rook on [0][l]
      moveTable[1][l][0] === 0 && moveTable[2][l][0] === 0 && moveTable[3][l][0] === 0) { //empty between
      pushAidA(hitSummm, canMoveTo, 2, l, moveTable, isWhite, 9); //mark that cell if empty
    }
    if (moveTable[7][l][3] && moveTable[5][l][0] === 0 && moveTable[6][l][0] === 0) { //empty between
      pushAidA(hitSummm, canMoveTo, 6, l, moveTable, isWhite, 9); //mark that cell if empty
    }
  }
  return canMoveTo;
}

function horseCanMove(k, l, isWhite, moveTable, hitSummm) {
  var canMoveTo = [];
  pushAidA(hitSummm, canMoveTo, k + 1, l + 2, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k + 1, l - 2, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k - 1, l + 2, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k - 1, l - 2, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k + 2, l + 1, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k + 2, l - 1, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k - 2, l + 1, moveTable, isWhite, 3);
  pushAidA(hitSummm, canMoveTo, k - 2, l - 1, moveTable, isWhite, 3);
  return canMoveTo;
}

function createState(table) {
  // make this string and concat!!!!!!!!!!!!!!!!!!!!
  var stateToRemember = [];
  for (var i = 0; i < 8; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      var x = 10 * (~~table[i][j][0]) + (~~table[i][j][1]) + 55; //  B vagy nagyobb
      if (x < 65) x = 65; // ez egy nagy A

      stateToRemember[8 * i + j] = String.fromCharCode(x);
    }
  }
  return stateToRemember.join('');
}

function getPushString(table, moveCoords) {
  const whatM = table[moveCoords[0]][moveCoords[1]];
  // var cWhatMoves = String(whatM[0]); //color of whats moving
  var pWhatMoves = String(whatM[1]); //piece

  var whatsHit = table[moveCoords[2]][moveCoords[3]][0].toString() + //color of whats hit
    table[moveCoords[2]][moveCoords[3]][1]; //piece

  if (whatM[1] === 1 && //paraszt
    moveCoords[0] !== moveCoords[2] && //keresztbe
    whatsHit === '00' //uresre
  ) { //akkor tuti enpass
    if (whatM[0] === 1) { //fekete
      whatsHit = '21'; //akkor feher parasztot ut
    } else {
      whatsHit = '11';
    }
  }
  // return whatM[0].toString() + whatM[1] + coordsToMoveString(...moveCoords) + whatsHit;
  return whatM[0].toString() + whatM[1] + moveCoords.join('') + whatsHit;
}

export function moveInTable(moveCoords, dbTable, isLearner) {
  var toPush = getPushString(dbTable.table, moveCoords); //piece

  dbTable.moves.push(toPush);
  dbTable.table = moveIt(moveCoords, dbTable.table); //	<-= 1-= 1moves it

  dbTable.wNext = !dbTable.wNext;
  dbTable.pollNum += 1;
  dbTable.moveCount += 1;
  dbTable.table = addMovesToTable(dbTable.table, dbTable.wNext);
  var pushThis = createState(dbTable.table);
  dbTable.allPastTables.push(pushThis);
  return dbTable;
}

function captured(table, color) {
  var tempMoves = [];
  var myCol = 1;
  if (color) myCol += 1; //myCol is 2 when white

  for (var i = 0; i < 8; i += 1) {
    for (var j = 0; j < 8; j += 1) {
      if (table[i][j][1] === 9 && table[i][j][0] === myCol) {
        //itt a kiraly

        tempMoves = bishopCanMove(i, j, color, table, [0]);
        for (var tempMoveCount = 0; tempMoveCount < tempMoves.length; tempMoveCount += 1) {
          if (table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 5 ||
            table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 2) {
            return true;
          }
        }
        tempMoves = rookCanMove(i, j, color, table, [0]);
        for (var tempMoveCount = 0; tempMoveCount < tempMoves.length; tempMoveCount += 1) {
          if (table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 5 ||
            table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 4) {
            return true;
          }
        }
        tempMoves = horseCanMove(i, j, color, table, [0]);
        for (var tempMoveCount = 0; tempMoveCount < tempMoves.length; tempMoveCount += 1) {
          if (table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 3) {
            return true;
          }
        }
        if (color ? j < 7 : j > 0) {
          tempMoves = pawnCanMove(i, j, color, table, [0]);
          for (var tempMoveCount = 0; tempMoveCount < tempMoves.length; tempMoveCount += 1) {
            if (table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 1) {
              return true;
            }
          }
        }
        tempMoves = kingCanMove(i, j, color, table, [0]);
        for (var tempMoveCount = 0; tempMoveCount < tempMoves.length; tempMoveCount += 1) {
          if (table[tempMoves[tempMoveCount][0]][tempMoves[tempMoveCount][1]][1] === 9) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export function moveIt(moveCoords, intable, dontProtect, hitValue) {
  if (hitValue === undefined) var hitValue = [0];
  var thistable = [];
  for (var i = 0; i < 8; i += 1) {
    thistable[i] = new Array(8);
    for (var j = 0; j < 8; j += 1) {
      // thistable[i][j] = intable[i][j].slice(0, 4)  //crashes in cordova, typedArray has no slice...
      thistable[i][j] = new Array(4);
      for (var k = 0; k < 4; k += 1) thistable[i][j][k] = intable[i][j][k];
    }
  }
  //itt indil sanc bastyatolas
  if (thistable[moveCoords[0]][moveCoords[1]][1] === 9 && thistable[moveCoords[0]][moveCoords[1]][3]) {
    // moving a king that hasnt moved yet
    switch (moveCoords[2]) {
      case 2:
        switch (moveCoords[3]) {
          case 0:
            thistable = moveIt([0, 0, 3, 0], thistable);
            break;
          case 7:
            thistable = moveIt([0, 7, 3, 7], thistable);
            break;
          default:
        }
        break;
      case 6:
        switch (moveCoords[3]) {
          case 0:
            thistable = moveIt([7, 0, 5, 0], thistable);
            break;
          case 7:
            thistable = moveIt([7, 7, 5, 7], thistable);
            break;
          default:
        }
        break;
      default:
    }
  }
  //es itt a vege

  //itt indul en passant mark the pawn to be hit

  //unmark all first

  for (let ij = 0; ij < 8; ij += 1) {
    thistable[ij][3][3] = false; //can only be in row 3 or 4

    thistable[ij][4][3] = false;
  }
  if (thistable[moveCoords[0]][moveCoords[1]][1] === 1 &&
    ((moveCoords[1] === 1 && moveCoords[3] === 3) ||
      (moveCoords[1] === 6 && moveCoords[3] === 4))) { //ha paraszt kettot lep

    thistable[moveCoords[0]][moveCoords[1]][3] = true; //[3]true for enpass
  }
  //es itt a vege

  //indul en passt lepett
  var enPass = false;
  if (
    thistable[moveCoords[0]][moveCoords[1]][1] === 1 && //paraszt
    thistable[moveCoords[2]][moveCoords[3]][0] === 0 && //uresre
    (moveCoords[0] !== moveCoords[2]) //keresztbe
  ) {
    enPass = true;
    thistable[moveCoords[2]][moveCoords[3]] = thistable[moveCoords[2]][moveCoords[1]];
    thistable[moveCoords[2]][moveCoords[1]] = [0, 0, false, false, false]; //ures
  }
  hitValue[0] = thistable[moveCoords[2]][moveCoords[3]][1]; //normal hivalue

  if (thistable[moveCoords[0]][moveCoords[1]][1] === 1 && ( //ha paraszt es
    // (thistable[moveCoords[0]][moveCoords[1]][0] === 2 && //es feher
    moveCoords[3] === 7 || //es 8asra lep vagy
    // (thistable[moveCoords[0]][moveCoords[1]][0] === 1 && //vagy fekete
    moveCoords[3] === 0 //1re
  )) {
    //AKKOR
    thistable[moveCoords[0]][moveCoords[1]][1] = 5; //kiralyno lett
    hitValue[0] += 4; //this move worth the difference betwwen queen's and pawn's value (5-1)
  }
  // // if(enPass) {
  // // 	hitValue = 0.99
  // // } else {
  // hitValue[0] = thistable[moveCoords[2]][moveCoords[3]][1]; //normal hivalue
  //   //- thistable[moveCoords[0]][moveCoords[1]][1] / 100 //whathits
  //   //}
  thistable[moveCoords[0]][moveCoords[1]][2] += 1; //times moved

  thistable[moveCoords[2]][moveCoords[3]] =
    thistable[moveCoords[0]][moveCoords[1]];
  thistable[moveCoords[0]][moveCoords[1]] = [0, 0, 0]; //, false, false, false]
  if (!(thistable[moveCoords[2]][moveCoords[3]][1] === 1)) {
    thistable[moveCoords[2]][moveCoords[3]][3] = false;
  }
  return thistable;
}

export function coordsToMoveString(a, b, c, d) {
  return String.fromCharCode(97 + a) + (b + 1) + String.fromCharCode(97 + c) + (d + 1);
}

function pawnCanMoveN(k, l, moveTable, /*protectedArray null ,*/ c/*, iHitMoves, /*protectScore, possibleMoves*/) {
  if (c === 2) { //white pawn
    pushAidXN(k, l, k + 1, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    pushAidXN(k, l, k - 1, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    return;
  }
  pushAidXN(k, l, k + 1, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidXN(k, l, k - 1, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
}

function rookCanMoveN(k, l, moveTable, /*protectedArray, */c, /*iHitMoves, protectScore, possibleMoves*/) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
}

function bishopCanMoveN(k, l, moveTable, /*protectedArray, */c, /*iHitMoves, protectScore, possibleMoves*/) {
  var i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j -= 1;
  }
}

function queenCanMoveN(k, l, moveTable, /*protectedArray, */c, /*iHitMoves, protectScore, possibleMoves*/) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j -= 1;
  }
}

function kingCanMoveN(k, l, moveTable, /*protectedArray, */c, /*iHitMoves, protectScore, possibleMoves*/) {
  pushAidN(k, l, k + 1, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  //sanc
  if (moveTable[k][l][3]) { //if the king hasnt moved yet, 
    // ha nincs sakkban, nem is ugrik at sakkot, minden ures kozotte
    if (moveTable[0][l][3] && // unmoved rook on [0][l]
      moveTable[1][l][0] === 0 && moveTable[2][l][0] === 0 && moveTable[3][l][0] === 0) { //empty between
      pushAidN(k, l, 2, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    }
    if (moveTable[7][l][3] && moveTable[5][l][0] === 0 && moveTable[6][l][0] === 0) { // unmoved rook on [7][l] && empty between
      pushAidN(k, l, 6, l, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    }
  }
}

function horseCanMoveN(k, l, moveTable, /*protectedArray, */c, /*iHitMoves, protectScore, possibleMoves*/) {
  pushAidN(k, l, k + 1, l + 2, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l - 2, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l + 2, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l - 2, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 2, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 2, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 2, l + 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 2, l - 1, c, moveTable, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
}

function whatsThereN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [0];
}

function whatsThereNN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [3]; // off the table
}

function pushAidN(k, l, x, y, c, table, /*protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
  var isThere = whatsThereN(x, y, table);
  if (isThere[0] !== 0) { //van ott vmi
    if (isThere[0] === c) {
      //my piece is there
      // protectScore[0] += 1;
      /* nem jott be */ table[x][y][3] = (table[x][y][3] || []).concat(table[k][l][1]) //protectedBy

      // protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
    } else {
      //opps piece is there
      // possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      /* nem jott be */ table[x][y][2] = (table[x][y][2] || []).concat(table[k][l][1]) //attackedBy

      // iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
    }
    return true;
  }
  // possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidXN(k, l, x, y, c, table, /* protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
  if (x < 0 || x > 7) return false; // off the table
  if (table[x][y][0] !== 0) { //van ott vmi
    if (table[x][y][0] === c) {
      //my piece is there
      // protectScore[0] += 1;


      /* nem jott be */ table[x][y][3] = (table[x][y][3] || []).concat(table[k][l][1]) //protectedBy
      // protectedArray[x][y] = true; //protected
    } else {
      //opps piece is there
      // possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      // iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
      /* nem jott be */ table[x][y][2] = (table[x][y][2] || []).concat(table[k][l][1]) //attackedBy

    }
    return true;
  }
  // possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidNN(k, l, x, y, c, table, /*protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
  // returns gofurther for rook, bishop or queen 
  var isThere = whatsThereNN(x, y, table);
  if (isThere[0] === 3) return false; // off the table, dont go further
  if (isThere[0] === 0) { //ures mezo
    // possibleMoves[8 * x + y] = true;
    return true; // go further
  }
  if (isThere[0] === c) {
    //my piece is there
    // protectScore[0] += 1;
    // protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
    /* nem jott be */ table[x][y][3] = (table[x][y][3] || []).concat(table[k][l][1]) //protectedBy

  } else {
    //opps piece is there
    // possibleMoves[8 * x + y] = true;
    /* nem jott be */ table[x][y][2] = (table[x][y][2] || []).concat(table[k][l][1]) //attackedBy

    // iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
  }
  return false;
}

function fastMove(moveCoords, intable, dontProtect, hitValue) {
  var thistable = new Array(8);
  for (var i = 0; i < 8; i += 1) {
    thistable[i] = new Array(8);
    for (var j = 0; j < 8; j += 1) {
      thistable[i][j] = [intable[i][j][0], intable[i][j][1]]//new Int8Array(2);
      // thistable[i][j][0] = intable[i][j][0];
      // thistable[i][j][1] = intable[i][j][1];
    }
  }
  if (thistable[moveCoords[0]][moveCoords[1]][1] === 9 && thistable[moveCoords[0]][moveCoords[1]][3]) {
    // moving a king that hasnt moved yet
    switch (moveCoords[2]) {
      case 2:
        switch (moveCoords[3]) {
          case 0:
            thistable = fastMove([0, 0, 3, 0], thistable);
            break;
          case 7:
            thistable = fastMove([7, 0, 5, 0], thistable);
            break;
          default:
        }
        break;
      case 7:
        switch (moveCoords[3]) {
          case 0:
            thistable = fastMove([0, 7, 3, 7], thistable);
            break;
          case 7:
            thistable = fastMove([7, 7, 5, 7], thistable);
            break;
          default:
        }
        break;
      default:
    }
  }
  if (thistable[moveCoords[0]][moveCoords[1]][1] === 1 && ( //ha paraszt es
    moveCoords[3] === 7 || //es 8asra lep vagy
    moveCoords[3] === 0 //1re
  )) {
    // THEN
    thistable[moveCoords[0]][moveCoords[1]][1] = 5; //kiralyno lett
  }
  thistable[moveCoords[2]][moveCoords[3]] =
    thistable[moveCoords[0]][moveCoords[1]];
  thistable[moveCoords[0]][moveCoords[1]] = [0, 0, 0]; //, false, false, false]
  return thistable;
}

function newCanMove(k, l, moveTable) {
  //[who k,l where to x,y who, hits]
  const c = moveTable[k][l][0];
  var what = moveTable[k][l][1];
  switch (what) {
    case 1:
      pawnCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 2:
      bishopCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 3:
      horseCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 4:
      rookCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 5:
      queenCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 9:
      kingCanMoveN(k, l, moveTable, /*null protectedArray,*/ c,/* iHitMoves, protectScore/*, possibleMoves*/);
      break;
  }
}

export function getHitScores(origTable, wNext) {
  const c = wNext ? 2 : 1;

  // write data on cells
  for (var lookI = 0; lookI < 8; lookI += 1) {
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table
      if (origTable[lookI][lookJ][0] === 0) continue; // empty cell
      newCanMove(lookI, lookJ, origTable); //newCanMove will protect the table
    }
  }

  // process that data gathered above
  let totalValue = 0;

  for (var lookI = 0; lookI < 8; lookI += 1) {
    cellLoop:
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table
      if (origTable[lookI][lookJ][0] === 0 || !origTable[lookI][lookJ][2]) continue cellLoop; // empty cell or not attacked cell

      if (origTable[lookI][lookJ][0] !== c) {
        // opponent's piece
        let thisCellValue = 0;
        let weakestProtector;
        let weakestAttacker;
        let hasMoreAttackers;
        let hasMoreProtectors;

        if (!origTable[lookI][lookJ][3]) { // cell has no protector
          totalValue += origTable[lookI][lookJ][1]; // this cell can be hit, add value and check next cell
          continue cellLoop;
        }
        // cell has protector

        thisCellValue += origTable[lookI][lookJ][1]; // add cell value

        origTable[lookI][lookJ][2].sort((a, b) => b - a); // weakest attacker to the end;
        weakestAttacker = origTable[lookI][lookJ][2].pop();

        origTable[lookI][lookJ][3].sort((a, b) => b - a); // weakest protector to the end;
        weakestProtector = origTable[lookI][lookJ][3].pop();

        hasMoreAttackers = origTable[lookI][lookJ][2].length !== 0;
        if (
          hasMoreAttackers &&
          weakestAttacker < weakestProtector // the protector worth more than the 1st attacker used
        ) {
          // break here, protector will not be used, doesn't worth it
          totalValue += thisCellValue;
          continue cellLoop;
        }
        // weakest attacker will be hit

        thisCellValue -= weakestAttacker; // deduct weakest attacker

        if (!hasMoreAttackers) { // no more attackers
          if (thisCellValue > 0) totalValue += thisCellValue; // add cellvalue if worth to hit
          continue cellLoop;
        };
        // there are more attackers

        weakestAttacker = origTable[lookI][lookJ][2].pop(); // second weakest
        hasMoreProtectors = origTable[lookI][lookJ][3].length !== 0;
        while (true) {
          if (
            hasMoreProtectors &&
            weakestProtector < weakestAttacker
          ) {
            // break here, attacker will not be used, doesn't worth it
            if (thisCellValue > 0) totalValue += thisCellValue; // add cellvalue if worth to hit
            continue cellLoop;
          }
          // weakest protector will be hit

          thisCellValue += weakestProtector; // add weakest protector value

          // while (true) {
          if (!hasMoreProtectors) { // no more protectors
            if (thisCellValue > 0) totalValue += thisCellValue; // add cellvalue if worth to hit
            continue cellLoop;
          };
          // there are more protectors

          weakestProtector = origTable[lookI][lookJ][3].pop();
          hasMoreAttackers = origTable[lookI][lookJ][2].length !== 0;

          if (
            hasMoreAttackers &&
            weakestAttacker < weakestProtector
          ) {
            // break here, attacker will not be used, doesn't worth it
            if (thisCellValue > 0) totalValue += thisCellValue; // add cellvalue if worth to hit
            continue cellLoop;
          }
          // weakest attacker will be hit

          thisCellValue -= weakestAttacker;

          if (!hasMoreAttackers) { // no more attackers
            if (thisCellValue > 0) totalValue += thisCellValue;
            continue cellLoop;
          };
          // there are more attackers

          weakestAttacker = origTable[lookI][lookJ][2].pop();
          hasMoreProtectors = origTable[lookI][lookJ][3].length !== 0;
        }
      }
    }
  }

  return totalValue * 100;
};


function solveSmallDeepeningTask(sdt, resolverArray) {
  //gets one task, produces an array of more tasks
  //or empty array when done

  var result = []
  var newWNext = !sdt.wNext;
  if (sdt.depth === 2) { //on 2nd level remove invalids. would be nice on all levels, but performance is bad
    if (captured(sdt.table, newWNext)) {
      //invalid move, sakkban maradt

      // this below is BS, someone maybe won the game here?
      result = [new SmallDeepeningTask(sdt.table, newWNext, sdt.depth + 1,
        sdt.moveTree, sdt.desiredDepth, 100,
        sdt.wPlayer, false, sdt.gameNum,
        sdt.mod, sdt.shouldIDraw, sdt.moveCountTree.concat(20))] // TODO: 20 is random, defo wrong this whole bit.
    }
  }
  //these new tasks go to a fifo array, we solve the tree bit by bit
  //keeping movestrings only, not eating memory with tables

  //get hitvalue for each move, keep best ones only
  //end of tree check if we got it wrong and go back if treevalue gets less!!!!!!!!!!!!!!!! // TODO: what did i mean there?
  if (sdt.trItm) { //we solved all moves for a table, time to go backwards
    //do some work in resolverArray		
    //then clear that array
    resolveDepth(sdt.depth, resolverArray);
    return result;
  }
  if (sdt.depth > sdt.desiredDepth) { //depth +1

    resolverArray[sdt.depth][resolverArray[sdt.depth].length] = new ResolverItem(sdt.score,
      sdt.moveTree, sdt.wPlayer); //this will fill in and then gets reduced to best movevalue only

  } else {
    var isNegative = (sdt.depth & 1)
    if (sdt.depth === sdt.desiredDepth) {
      //////depth reached, eval table

      // if (Math.random() < 0.00003) console.log(sdt.moveCountTree.reduce((p, c) => p * c, 1))

      const newScore = isNegative
        ? sdt.score - getHitScores(sdt.table, sdt.wNext)
        : sdt.score + getHitScores(sdt.table, sdt.wNext);

      result[result.length] = new SmallDeepeningTask(
        [], //no table
        newWNext,
        sdt.depth + 1,
        sdt.moveTree,
        sdt.desiredDepth,
        newScore, //sdt.score + thisValue
        sdt.wPlayer,
        false,
        sdt.gameNum,
        sdt.mod,
        sdt.shouldIDraw
      )
    } else {
      //depth not solved, lets solve it further

      var possibleMoves = []
      //below returns a copied table, should opt out for speed!!!!!!!
      addMovesToTable(sdt.table, sdt.wNext, true, possibleMoves) //this puts moves in strings, should keep it fastest possible

      //true to 				//it will not remove invalid moves to keep fast 
      //keep illegal			//we will remove them later when backward processing the tree

      //here we have possiblemoves filled in with good, bad and illegal moves

      for (var i = possibleMoves.length - 1; i >= 0; i -= 1) {
        var moveCoords = possibleMoves[i]
        var movedTable = []
        movedTable = fastMove(moveCoords, sdt.table, true) //speed! put this if out of here, makeamove only false at the last run


        var whatGetsHit = sdt.table[moveCoords[2]][moveCoords[3]];
        var thisValue = whatGetsHit[1] * 100 //piece value, should += 1 when en-pass

        var valueToSave

        if (isNegative) { //does this work???!!!!!!!!!!! // seems so. easy.
          valueToSave = sdt.score - thisValue
        } else {
          valueToSave = sdt.score + thisValue
        }
        var newMoveTree = sdt.moveTree.concat([moveCoords, valueToSave]);
        result[result.length] = new SmallDeepeningTask(
          movedTable,
          newWNext,
          sdt.depth + 1,
          newMoveTree,
          sdt.desiredDepth,
          valueToSave, //sdt.score + thisValue
          sdt.wPlayer,
          false,
          sdt.gameNum,
          sdt.mod,
          sdt.shouldIDraw,
          sdt.moveCountTree.concat(possibleMoves.length),
        )
      } //  )    //end of for each move

    }
    result[result.length] = new TriggerItem(sdt.depth + 1, sdt.moveTree, sdt.wPlayer)
    //this will trigger move calc when processing array (will be placed before each set of smalltasks)
  }
  return result

}

export function solveDeepeningTask(deepeningTask, isSdt) { //designed to solve the whole deepening task on one thread
  //will return number of smallTasks solved for testing??!!!!!!!!!!!!!!!
  //var taskValue = deepeningTask.
  var retProgress = deepeningTask.progress

  var startedAt = new Date().getTime()
  if (isSdt) {
    //we are in worker, received 2nd depth table already processed with oneDeeper()
    //this table is after his first return move
    //not filtered move, could be that we can hit the king now
    //if we can, then this is a wrong move, need to throw away the whole lot!!!!!!!!!!!!!!!!!
    var tempDeepeningTask = {
      desiredDepth: deepeningTask.desiredDepth,
      smallDeepeningTasks: [deepeningTask],
      wPlayer: deepeningTask.wPlayer,
      mod: deepeningTask.mod,
      shouldIDraw: deepeningTask.shouldIDraw
    }
    deepeningTask = tempDeepeningTask
  }
  var resolverArray = [] //multidim, for each depth the results, will be updated a million times

  var p2 = deepeningTask.desiredDepth + 2;
  for (var i = 0; i < p2; i += 1) {
    resolverArray[i] = []
  }
  while (deepeningTask.smallDeepeningTasks.length > 0) {
    //length is 1 at first, then just grows until all has reached the level. evetually there will be nothing to do and this loop exists

    var smallDeepeningTask = deepeningTask.smallDeepeningTasks.pop()
    // smallDeepeningTask.table = toTypedTable(smallDeepeningTask.table)
    var resultingSDTs = solveSmallDeepeningTask(smallDeepeningTask, resolverArray)
    for (var l = resultingSDTs.length - 1; l >= 0; l -= 1) {
      deepeningTask.smallDeepeningTasks[deepeningTask.smallDeepeningTasks.length] = resultingSDTs[l]; //at the beginning the unsent array is just growing but then we run out
    }
    //call it again if there are tasks
  }
  var timeItTook = new Date()
    .getTime() - startedAt

  var ret = {
    gameNum: deepeningTask.gameNum,
    progress: retProgress,
    timeItTook: timeItTook,
    score: resolverArray[2][0].value,
    moveTree: resolverArray[2][0].moveTree//.join(',')
  }
  if (isSdt !== true) {
    ret.score = resolverArray[1][0].value

  }
  return ret
}

export function oneDeeper(deepeningTask) { //only takes original first level deepeningtasks??
  var resolverArray = []
  var smallDeepeningTask = deepeningTask.smallDeepeningTasks.pop()
  var tempTasks = solveSmallDeepeningTask(smallDeepeningTask,
    smallDeepeningTask.resolverArray) //, counter)
  while (tempTasks.length > 0) {
    var tempTask = tempTasks.pop()
    deepeningTask.smallDeepeningTasks[deepeningTask.smallDeepeningTasks.length] = tempTask;
  }
  deepeningTask.smallDeepeningTasksCopy = deepeningTask.smallDeepeningTasks.slice()
  deepeningTask.resolverArray = resolverArray

}

export function resolveDepth(depth, resolverArray) {
  if (resolverArray[depth].length > 0) {
    var raDm1 = resolverArray[depth - 1];
    if (depth & 1) {
      raDm1[raDm1.length] = resolverArray[depth].reduce(
        function (previousValue, currentValue, index, array) {
          if (currentValue.value > previousValue.value) {
            return {
              value: currentValue.value,
              moveTree: currentValue.moveTree
            } //currentValue

          } else {
            return {
              value: previousValue.value,
              moveTree: previousValue.moveTree
            } //previousValue
          }
        }
      )
    } else {
      raDm1[raDm1.length] = resolverArray[depth].reduce(
        function (previousValue, currentValue, index, array) {
          if (currentValue.value < previousValue.value) {
            return {
              value: currentValue.value,
              moveTree: currentValue.moveTree
            }
          } else {
            return {
              value: previousValue.value,
              moveTree: previousValue.moveTree
            }
          }
        }
      )
    }
  }
  resolverArray[depth] = []
}

var SmallDeepeningTask = function (table, wNext, depth, moveTree, desiredDepth, score, wPlayer, stopped, gameNum, mod, shouldIDraw, moveCountTree) {
  this.gameNum = gameNum

  this.wPlayer = wPlayer

  this.table = table

  this.wNext = wNext

  this.depth = depth

  this.moveTree = moveTree

  this.desiredDepth = desiredDepth

  this.score = score

  this.mod = mod

  this.shouldIDraw = shouldIDraw

  this.moveCountTree = moveCountTree

}

export const DeepeningTask = function (smallMoveTask) { //keep this fast, designed for main thread and mainWorker ???not sure..     //smallMoveTask is a smallMoveTask, to be deepend further

  // console.log({xxx: smallMoveTask.firstLevelMoveCount})

  this.shouldIDraw = smallMoveTask.sharedData.shouldIDraw

  this.firstLevelMoveCount = smallMoveTask.firstLevelMoveCount

  this.mod = smallMoveTask.mod

  this.gameNum = smallMoveTask.sharedData.gameNum

  this.progress = smallMoveTask.progress

  this.resolverArray = []
  this.initialWNext = smallMoveTask.sharedData.origWNext


  this.moveStr = smallMoveTask.moveCoords;
  // [
  //   smallMoveTask.moveCoords[0],
  //   smallMoveTask.moveCoords[1],
  //   smallMoveTask.moveCoords[2],
  //   smallMoveTask.moveCoords[3]
  // ]            //smallMoveTask.stepMove //all resulting tables relate to this movestring: deppeningtask is made of smallmovetask..
  this.initialTreeMoves = [this.moveStr] //to put in first smallmovetask

  this.startingTable = smallMoveTask.sharedData.origTable //this was calculated in advance when getting the first moves: that resulted in this.everything
  this.startingAllPastTables = smallMoveTask.sharedData.allPast
  this.thisTaskTable = moveIt(this.moveStr, this.startingTable, true) //this is the first and should be only time calculating this!!!!!
  //takes time
  this.firstDepthValue = this.startingTable[smallMoveTask.moveCoords[2]][smallMoveTask.moveCoords[3]][1] * 100         //smallMoveTask.firstDepthValue

  this.desiredDepth = smallMoveTask.sharedData.desiredDepth //we will deepen until depth reaches this number

  this.actualDepth = 1 //its 1 because we have 1st level resulting table fixed. 
  //increase this when generating deeper tables, loop while this is smaller than desiredDepth

  //this task should be sent back to the server so lets ke


  this.tableTree = [] //fill multiDIM array with resulting tables during processing
  this.moveStrTree = [] //twin array with movesString


  this.tableTree[0] = [this.startingTable] // depth 0 table, startingTable: only one in an array

  this.tableTree[1] = [this.thisTaskTable] // depth 1 tables, we only have one in this task but there are more in total

  this.tableTree[2] = [] // depth 2 tables are empty at init, we will fill these in when processing this deepeningTask. after each depth we'll create the next empty array

  //there will be more levels here with a lot of tables

  //moveStings is one level deeper array, strings get longer each level to keep track of table!!!!!!
  this.moveStrTree[0] = [
    []
  ] //???					// depth 0 movestrings, meaning 'how did we get here?'	these are always unknown

  this.moveStrTree[1] = [
    [this.moveStr]
  ] // depth 1 movestrings, meaning 'how did we get here?', we only have one in this task but there are more in total

  this.moveStrTree[2] = [
    []
  ] // depth 2 movestrings, meaning 'how did we get here?', we will fill these together with the tableTree, all indexes will match as move=>resulting table

  //there will be more levels here with a lot of moveStrings


  this.smallDeepeningTaskCounts = [0, 1] //this will be an array of the total created smalldeepeningtasks per depth, depth 0 has 0, depth 1 has one in this splitmove


  var initialSmallDeepeningTask = new SmallDeepeningTask(this.thisTaskTable, !this.initialWNext, this.actualDepth, this.initialTreeMoves, this.desiredDepth, this.firstDepthValue, smallMoveTask.cfColor, false, this.gameNum, this.mod, this.shouldIDraw, [this.firstLevelMoveCount])
  //this.value=initialSmallDeepeningTask.score

  this.smallDeepeningTasks = [initialSmallDeepeningTask] //to be sent out for multiplying when processing for level 2 (unless desireddepth is 1)
  //this.pendingSmallDeepeningTasks=[]				//here we will keep the pending smalltasks: sent out 
  this.solvedSmallDeepeningTasks = [] //here we will keep the results until stepping to next depth, ready for next level when this.length equals count


}

var ResolverItem = function (inscore, inmoveTree, wPlayer) {
  this.value = inscore
  this.moveTree = inmoveTree

  this.wPlayer = wPlayer

}

var TriggerItem = function (depth, moveTree, wPlayer) {		//these will be put in main deepeningTaskArray to trigger calculation of totals for each level
  this.trItm = true


  this.depth = depth
  //this.parentMove=parentMoveStr			//4 char string
  this.moveTree = moveTree
  this.wPlayer = wPlayer
}
