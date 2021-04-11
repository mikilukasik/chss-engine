/////////////general////////////////////// 
var objectToString = function (obj) {
  var cache = [];
  return JSON.stringify(obj, function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (cache.indexOf(value) !== -1) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.push(value);
    }
    return value;
  });
};

///////////////////evalgame////////////////
var evalFuncs = {
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



function canIMove(winTable, winColor) {
  var winRetMoves = [];
  getAllMoves(winTable, winColor).forEach(function (thisMove) { //get all his moves in array of strings
    winRetMoves.push(coordsToMoveCoords(thisMove[0], thisMove[1], thisMove[2], thisMove[3]));
  });

  for (var i = winRetMoves.length - 1; i >= 0; i -= 1) { //sakkba 
    if (captured(moveIt(winRetMoves[i], winTable), winColor)) { //sakkba lepne valaszkent	//moveit retmove ittis ottis
      winRetMoves.splice(i, 1);
    }
  }
  return (winRetMoves.length > 0);
}


function checkIfFinished(dbTable) {

  var result = {
    goOn: true,
    result: {}
  };

  if (!canIMove(dbTable.table, dbTable.wNext) || dbTable.moveCount > 300) { // for learner, finish game at 300 moves

    result.goOn = false;
    result.looped = dbTable.moveCount > 300;

    dbTable.gameIsOn = false;
    dbTable.result = {

      blackWon: false,
      whiteWon: false,
      isDraw: false,

      whiteValue: 0,
      blackValue: 0,

      totalMoves: 0,
      moveLog: dbTable.moves,

      _id: dbTable._id

    };

    if (captured(dbTable.table, dbTable.wNext)) {

      if (dbTable.wNext) {

        dbTable.result.blackWon = true;

      } else {
        dbTable.result.whiteWon = true;

      }

    } else {
      dbTable.result.isDraw = true;
    }

    var pieceVals = evalFuncs.getPieceValues(dbTable);

    dbTable.result.whiteValue = pieceVals.wVal;
    dbTable.result.blackValue = pieceVals.bVal;

    dbTable.result.totalMoves = dbTable.moveCount;

  }

  result.result = dbTable.result;

  return result;

}

/////////////////////// from old ai //////////////////////////

function getMcFromMv(modVal) {

  var modConst = 1;

  if (modVal <= 50) {
    modConst = modVal / 50;
  } else {
    modConst = 50 / (100 - modVal);
  }
  modConst = Math.pow(modConst, 3);

  return modConst;

}

function getMvFromMc(modConst) {

  modConst = Math.pow(modConst, 1 / 3);

  var modVal = 0;

  if (modConst <= 1) {
    modVal = modConst * 50;
  } else {
    modVal = 100 - 50 / modConst;
  }

  return modVal;

}

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

function findMyPieces(origTable, isWhite) {
  var myTempPieces = [];
  var origColor = isWhite ? 2 : 1;

  for (var lookI = 0; lookI < 8; lookI += 1) { //
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table
      if (origTable[lookI][lookJ][0] === origColor) { //ha sajat babum
        myTempPieces[myTempPieces.length] = [lookI, lookJ, origTable[lookI][lookJ][1]]; //itt kene szamitott erteket is adni a babuknak 
      }
    }
  }
  return [0, myTempPieces]; //, hisTempPieces, rtnMyHitSum[0], rtnHisHitSum[0], rtnMyMovesCount] //returnArray // elso elem az osszes babu ertekenek osszge, aztan babkuk
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

function protectTable(table, myCol) {
  return protectPieces(table, myCol) - protectPieces(table, !myCol);
}

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
      returnMoveCoords[returnMoveCoords.length] = coordsToMoveCoords(k, l, move[0], move[1]);
    });

  }

  if (!speedy) { //     lefut.
    for (var i = possibleMoves.length - 1; i >= 0; i -= 1) { //sakkba nem lephetunk
      if (captured(moveIt(coordsToMoveCoords(k, l, possibleMoves[i][0], possibleMoves[i][1]), moveTable, dontProt), isWhite)) { //sakkba lepnenk
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

function whatsThere(i, j, aiTable) {
  if (i > -1 && j > -1 && i < 8 && j < 8) {
    return aiTable[i][j];
  }
  return [];
}

function pushAid(hitSummmm = [0], canMoveTo, x, y, hanyadik, milegyen, fromTable, isWhite, whatHits) {
  if (whatsThere(x, y, fromTable)[hanyadik] !== milegyen) return false;

  const target = fromTable[x][y];

  canMoveTo[canMoveTo.length] = [x, y, target[1]];

  var thisHit = 0;
  if (target[6]) { //alert('protectedHit')	//ha protectedre lep
    thisHit = target[1] - //thisHitbol kivonja amivel lep
      whatHits; //* whatHitsConst
    if (thisHit < 0) thisHit = 0; //negaive is 0
  } else {
    thisHit = target[1]; //normal hivalue
  }

  if (hitSummmm[0] < thisHit) hitSummmm[0] = thisHit;
  return true;
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
  // if (x < 0 || x > 7 || y < 0 || y > 7) console.log(arguments)
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

  return whatM[0].toString() + whatM[1] + coordsToMoveString(moveCoords) + whatsHit;

}

export function moveInTable(moveCoords, dbTable, isLearner) {
  // console.log(new Error().stack)
  // console.log(arguments)

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

function moveIt(moveCoords, intable, dontProtect, hitValue) {

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
  // console.log(arguments)
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

function coordsToMoveCoords(a, b, c, d) {
  return [a, b, c, d]
}


function coordsToMoveString(a, b, c, d) {
  return String.fromCharCode(97 + a) + (b + 1) + String.fromCharCode(97 + c) + (d + 1);
}

/////////////////////// from old ai end //////////////////////////

function pawnCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  if (c === 2) { //white pawn
    pushAidXN(k, l, k + 1, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
    pushAidXN(k, l, k - 1, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
    return;
  }
  pushAidXN(k, l, k + 1, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidXN(k, l, k - 1, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
}

function rookCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i -= 1;
}

function bishopCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  var i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i += 1;
    j += 1;
  }

  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i -= 1;
    j -= 1;
  }

  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i -= 1;
    j += 1;
  }

  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i += 1;
    j -= 1;
  }
}

function queenCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) i -= 1;
  i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i -= 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves)) {
    i += 1;
    j -= 1;
  }
}

function kingCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  pushAidN(k, l, k + 1, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 1, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k + 1, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 1, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k + 1, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 1, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);

  //sanc
  if (moveTable[k][l][3]) { //if the king hasnt moved yet, 
    // ha nincs sakkban, nem is ugrik at sakkot, minden ures kozotte
    if (moveTable[0][l][3] && // unmoved rook on [0][l]
      moveTable[1][l][0] === 0 && moveTable[2][l][0] === 0 && moveTable[3][l][0] === 0) { //empty between
      pushAidN(k, l, 2, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
    }
    if (moveTable[7][l][3] && moveTable[5][l][0] === 0 && moveTable[6][l][0] === 0) { // unmoved rook on [7][l] && empty between
      pushAidN(k, l, 6, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
    }
  }
}

function horseCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves) {
  pushAidN(k, l, k + 1, l + 2, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k + 1, l - 2, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 1, l + 2, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 1, l - 2, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);

  pushAidN(k, l, k + 2, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k + 2, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 2, l + 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
  pushAidN(k, l, k - 2, l - 1, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves);
}

function whatsThereN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [0];
}

function whatsThereNN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [3]; // off the table
}

function pushAidN(k, l, x, y, c, table, protectedArray, iHitMoves, protectScore, possibleMoves) {
  var isThere = whatsThereN(x, y, table);
  if (isThere[0] !== 0) { //van ott vmi
    if (isThere[0] === c) {
      //my piece is there
      protectScore[0] += 1;
      protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
    } else {
      //opps piece is there
      possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
    }
    return true;
  }
  possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidXN(k, l, x, y, c, table, protectedArray, iHitMoves, protectScore, possibleMoves) {
  if (x < 0 || x > 7) return false; // off the table
  if (table[x][y][0] !== 0) { //van ott vmi
    if (table[x][y][0] === c) {
      //my piece is there
      protectScore[0] += 1;
      protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
    } else {
      //opps piece is there
      possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
    }
    return true;
  }
  possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidNN(k, l, x, y, c, table, protectedArray, iHitMoves, protectScore, possibleMoves) {
  // returns gofurther for rook, bishop or queen 

  var isThere = whatsThereNN(x, y, table);
  if (isThere[0] === 3) return false; // off the table, dont go further
  if (isThere[0] === 0) { //ures mezo
    possibleMoves[8 * x + y] = true;
    return true; // go further
  }
  if (isThere[0] === c) {
    //my piece is there
    protectScore[0] += 1;
    protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
  } else {
    //opps piece is there
    possibleMoves[8 * x + y] = true;
    iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
  }
  return false;
}

function fastMove(moveCoords, intable, dontProtect, hitValue) {

  var thistable = new Array(8);
  for (var i = 0; i < 8; i += 1) {
    thistable[i] = new Array(8);
    for (var j = 0; j < 8; j += 1) {
      thistable[i][j] = new Int8Array(2);
      thistable[i][j][0] = intable[i][j][0];
      thistable[i][j][1] = intable[i][j][1];
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

function newCanMove(k, l, c, moveTable, protectedArray, iHitMoves, protectScore, possibleMoves) {

  //[who k,l where to x,y who, hits]

  var what = moveTable[k][l][1];

  switch (what) {

    case 1:

      pawnCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;
    case 2:
      bishopCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;
    case 3:
      horseCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;
    case 4:
      rookCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;
    case 5:
      queenCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;
    case 9:
      kingCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore, possibleMoves);

      break;

  }

}

function getHitScores(origTable, wNext, flipIt, wPlayer, mod) {

  var fwVdef = 1; //0.846;
  var fwV = 1;

  var bHKdef = 1;
  var bHK = 1;

  var hKMdef = 1;
  var hKM = 1;

  switch (mod && mod.modType) {
    case 'fwV':
      fwV = mod.modConst;
      break;
    case 'bHK':
      bHK = mod.modConst;
      break;
    case 'hKM':
      hKM = mod.modConst;
      break;

    default:
  }

  var pawnVal = 0;

  var iHitCoords = []; //[who k,l where to x,y, who, hits]
  var heHitsCoords = [];

  var myprotectScore = new Uint8Array(1); //[0]
  var hisprotectScore = new Uint8Array(1); //[0]

  var myAllHit = 0;
  var hisAllHit = 0;

  var myBestHit = 0;
  var hisBestHit = 0;

  var myBestHitCoords = [];

  var protectedArray = [ //new Array(8)

    new Uint8Array(8),
    new Uint8Array(8),
    new Uint8Array(8),
    new Uint8Array(8),

    new Uint8Array(8),
    new Uint8Array(8),
    new Uint8Array(8),
    new Uint8Array(8)

  ];

  var c;
  var nc;

  if (wNext) {
    nc = 1;
    c = 2;
  } else {
    c = 1;
    nc = 2;
  }

  var allMyMoves = {};
  var hisKingMoves = {};

  for (var lookI = 0; lookI < 8; lookI += 1) {
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table

      if (origTable[lookI][lookJ][0] === c) {
        ////////found my piece/////////
        ////////get all my moves and places i protect
        if (origTable[lookI][lookJ][1] === 1) {
          if (c === 1) {
            pawnVal += (7 - lookJ);
          } else {
            pawnVal += lookJ;
          }
        }
        newCanMove(lookI, lookJ, c, origTable, protectedArray, iHitCoords, myprotectScore, allMyMoves); //newCanMove will protect the table
        //and append all my hits to iHitCoords
        //will increase myprotectscore, inaccurate!!!!!!!				
      } else {

        if (origTable[lookI][lookJ][0] !== 0) { ////////found opponent's piece/////////												
          if (origTable[lookI][lookJ][1] === 1) {
            if (nc === 1) {
              pawnVal -= (7 - lookJ);
            } else {
              pawnVal -= lookJ;
            }

          }

          newCanMove(lookI, lookJ, nc, origTable, protectedArray, heHitsCoords, hisprotectScore, origTable[lookI][lookJ][1] === 9 ? hisKingMoves : {});
        }
      }

    }
  }

  iHitCoords.forEach(function (hitCoords) {
    var thisValue = 0;

    if (protectedArray[hitCoords[2]][hitCoords[3]]) { //if field is protected

      thisValue = hitCoords[5] - hitCoords[4]; //kivonja amivel lep

    } else {

      thisValue = hitCoords[5]; //else normal hitvalue

    }

    if (thisValue > myBestHit) { //remember best

      myBestHit = thisValue;

      myBestHitCoords = hitCoords;
    }

    myAllHit += thisValue;

  });

  heHitsCoords.forEach(function (hitCoords) {

    var thisValue = 0;

    if (protectedArray[hitCoords[2]][hitCoords[3]]) { //if cell is protected

      thisValue = hitCoords[5] - hitCoords[4]; //kivonja amivel lep

    } else {

      thisValue = hitCoords[5]; //normal hitvalue

    }

    if (thisValue > hisBestHit) { //remember best

      hisBestHit = thisValue;
      //
    }

    hisAllHit += thisValue;
  });

  var protecScore = myprotectScore[0] - hisprotectScore[0];
  var allhitScore = myAllHit - hisAllHit;

  var hisKingMArr = Object.keys(hisKingMoves);

  var hisKingMoveScore = 8 - (hisKingMArr.length);
  var blockHisKingScore = hisKingMArr.reduce((p, c) => allMyMoves[c] ? p + 1 : p, 0);


  pawnVal *= fwV * fwVdef;
  hisKingMoveScore *= hKM * hKMdef;
  blockHisKingScore *= bHK * bHKdef;

  var result = new Int32Array(1);
  result[0] = (myBestHit * 65536) - (hisBestHit * 4096);

  if (flipIt) {
    result[0] -= (protecScore << 8) + (allhitScore << 4) + (pawnVal) + (hisKingMoveScore << 9) + (blockHisKingScore << 10); //*1633333
  } else {
    result[0] += (protecScore << 8) + (allhitScore << 4) + (pawnVal) + (hisKingMoveScore << 9) + (blockHisKingScore << 10); //*1633333
  }

  return result;

}

// if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = {
//   moveInTable: moveInTable
// };


////////////////http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object
function clone(obj) {
  var copy;

  // Handle the 3 simple types, and null or undefined
  if (null === obj || "object" !== typeof obj) return obj;

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array
  if (obj instanceof Array) {
    copy = [];
    for (var i = 0, len = obj.length; i < len; i += 1) {
      copy[i] = clone(obj[i]);
    }
    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {};
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  }

  throw new Error("Unable to copy obj! Its type isn't supported.");
}

////////////////////http://stackoverflow.com/questions/728360/most-elegant-way-to-clone-a-javascript-object end

var MoveTaskN = function (dbTable, mod) {
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
    origDeepDatatt: getHitScores(dbTable.table, true, true, dbTable.wNext,
      mod),
    origDeepDatatf: getHitScores(dbTable.table, true, false, dbTable.wNext,
      mod),
    origDeepDataft: getHitScores(dbTable.table, false, true, dbTable.wNext,
      mod),
    origDeepDataff: getHitScores(dbTable.table, false, false, dbTable.wNext,
      mod),
  }

  this.moveCoords = getAllMoves(dbTable.table, dbTable.wNext, false, 0, true)

  var dontLoop = false
  if (this.sharedData.origData[0] > 1) {
    dontLoop = true
  }

  this.sharedData.dontLoop = dontLoop

}

function toTypedTable(table) {
  var result = []; //new Array(8)
  if (typeof table !== 'undefined') {
    for (var i = 0; i < 8; i += 1) {
      result[i] = []; //new Array(8)
      if (typeof table[i] !== 'undefined') {
        for (var j = 0; j < 8; j += 1) {
          result[i][j] = new Int8Array(table[i][j])
        }
      }
    }
  }
  return result
}

///////////////////////////// below the functions that run a million times ////////////////////////

function solveSmallDeepeningTask(sdt, resolverArray) {

  //**console.log(sdt.wPlayer)

  //this is the function that runs a million times

  // var sdt.depth = sdt.depth

  // var sdt.table = sdt.table

  // var sdt.score = new Int32Array(1)
  // var sdt.score = sdt.score

  //gets one task, produces an array of more tasks
  //or empty array when done

  var result = []

  var newWNext = !sdt.wNext;

  if (sdt.depth === 2) { //on 2nd level remove invalids
    if (captured(sdt.table, newWNext)) {
      //invalid move, sakkban maradt

      result = [new SmallDeepeningTask(sdt.table, newWNext, sdt.depth + 1,
        sdt.moveTree, sdt.desiredDepth, 100,
        sdt.wPlayer, false, sdt.gameNum,
        sdt.mod, sdt.shouldIDraw)]

    }

  }

  //these new tasks go to a fifo array, we solve the tree bit by bit
  //keeping movestrings only, not eating memory with tables

  //get hitvalue for each move, keep best ones only
  //end of tree check if we got it wrong and go back if treevalue gets less!!!!!!!!!!!!!!!!

  if (sdt.trItm) { //we solved all moves for a table, time to go backwards

    //do some work in resolverArray		
    //then clear that array

    resolveDepth(sdt.depth, resolverArray)

  } else {

    if (sdt.depth > sdt.desiredDepth) { //depth +1

      resolverArray[sdt.depth][resolverArray[sdt.depth].length] = new ResolverItem(sdt.score,
        sdt.moveTree, sdt.wPlayer); //this will fill in and then gets reduced to best movevalue only

    } else {

      var isNegative = (sdt.depth & 1)

      if (sdt.depth === sdt.desiredDepth) {
        //////depth reached, eval table

        var newScore;// = new Int32Array(1)

        //**console.log(sdt.shouldIDraw)

        if (isNegative) {

          newScore = (sdt.score << 16) - getHitScores(sdt.table,
            sdt.wNext, false, sdt.wPlayer,
            sdt.mod, sdt.shouldIDraw)[0]

        } else {

          newScore = (sdt.score << 16) + getHitScores(sdt.table,
            sdt.wNext, true, sdt.wPlayer,
            sdt.mod, sdt.shouldIDraw)[0]
        }

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

          var thisValue = whatGetsHit[1] //piece value, should += 1 when en-pass

          var valueToSave

          if (isNegative) { //does this work???!!!!!!!!!!!

            valueToSave = sdt.score - thisValue
          } else {

            valueToSave = sdt.score + thisValue
          }

          var newMoveTree = sdt.moveTree.concat([moveCoords,
            valueToSave])

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
            sdt.shouldIDraw
          )


        } //  )    //end of for each move

      }

      result[result.length] = new TriggerItem(sdt.depth + 1, sdt.moveTree,
        sdt.wPlayer)
      //this will trigger move calc when processing array (will be placed before each set of smalltasks)

    }

  }

  return result

}

function solveDeepeningTask(deepeningTask, isSdt) { //designed to solve the whole deepening task on one thread
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

function deepMove(smallMoveTask) { //for 1 thread, smallmovetask has one of my possible 1st moves

  // var started = new Date()
  // 	.getTime()

  var solvedTableCount = 0

  // var value = 0

  var deepeningTask = new DeepeningTask(smallMoveTask) //deepeningtask to be able to create 2nd level set for workers

  //var tempCommand = ''

  //var thisMoveValue=0

  //var ranCount=
  var totals = solveDeepeningTask(deepeningTask, '') //single thread calc

  solvedTableCount += totals.solved

  return { //this goes to console chat window
    move: deepeningTask.moveCoords,
    score: totals.score,
    moveTree: totals.moveTree,
    solved: totals.solved,
    _id: smallMoveTask._id,
    depth: deepeningTask.desiredDepth
  }

}

function mtProcessDeepSplitMoves(data, thinker, mt, modConst, looped) {
  var newData = []
  var ranCount = 0
  while (data.length > 0) {

    var toPush = deepMove(data.pop(), ranCount)
    toPush.thinker = thinker
    newData[newData.length] = toPush;

  }
  newData.solved = ranCount
  return newData
}

function oneDeeper(deepeningTask) { //only takes original first level deepeningtasks??

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

export function singleThreadAi(tempDbTable, depth, cb, mod) {

  var dbTable = clone(tempDbTable)

  dbTable.moveTask = new MoveTaskN(dbTable, mod)

  dbTable.moveTask.sharedData.desiredDepth = depth

  //from server
  var tempMoves = new SplitMove(dbTable).movesToSend

  //////////from mainworker
  tempMoves.forEach(function (splitMove) {

    splitMove.progress = {

      moveCoords: splitMove.moveCoords,
      moveIndex: splitMove.moveIndex,

      done: false,
      result: {},

      expected: undefined,

    }

  })

  var result = []

  tempMoves.forEach(function (smallMoveTask, index) {
    //var dTask=new DeepeningTask(smallMoveTask)

    var deepeningTask = new DeepeningTask(smallMoveTask)

    oneDeeper(deepeningTask) //this will make about 30 smalldeepeningtasks from the initial 1 and create deepeningtask.resolverarray
    //first item in deepeningtask.smalldeepeningtasks is trigger

    //!!!!!!!!!!!implement !!!!!!!!!!typedarray

    var res = []

    while (deepeningTask.smallDeepeningTasks.length > 1) {

      var smallDeepeningTask = deepeningTask.smallDeepeningTasks.pop()

      smallDeepeningTask.progress = deepeningTask.progress

      ////////////////from subworker

      var res2 = solveDeepeningTask(smallDeepeningTask, true)

      res2.value = res2.score

      res[res.length] = res2;

    }

    var tempResolveArray = []

    tempResolveArray[1] = []
    tempResolveArray[2] = res
    tempResolveArray[3] = []

    resolveDepth(2, tempResolveArray)

    var pushAgain = tempResolveArray[1][0]

    var moveCoords = pushAgain.moveTree[0]//.slice(0, 4)

    var wouldLoop

    if (!dbTable.moveTask.shouldIDraw) {

      //**console.log('i shouldn\'t draw')

      var movedTable = moveIt(moveCoords, dbTable.table)
      //**console.log(movedTable)
      wouldLoop = evalFuncs.checkIfLooped(movedTable, dbTable.allPastTables)
      //**console.log(wouldLoop)

    } else {
      //**console.log('i can draw')
    }
    if (wouldLoop) pushAgain.value -= Math.pow(wouldLoop, 5)
    //pushAgain.moveIndex=resData.progress.moveIndex
    //pushAgain._id = workingOnGameNum
    pushAgain.score = pushAgain.value
    //pushAgain.thinker = sendID.toString() //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1
    pushAgain.move = moveCoords

    result[result.length] = pushAgain;

  })

  result.sort(function (a, b) {

    if (a.score < b.score) {
      return 1
    } else {
      if (a.score === b.score) {
        return 0
      } else {
        return -1
      }
    }

  })

  var finalResult = {
    result: result,
    winningMove: result[0],
    moveCoords: result[0].moveTree[0]//.slice(0, 4)
  }
  //res.winningMove=res[0]

  if (cb) cb(finalResult)

  return finalResult

}

function resolveDepth(depth, resolverArray) {

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


var SmallDeepeningTask = function (table, wNext, depth, moveTree, desiredDepth, score, wPlayer, stopped, gameNum, mod, shouldIDraw) {

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

  //if(shouldIDraw!=undefined)console.log(shouldIDraw)

}
var MoveToSend = function (moveCoord, index, dbTableWithMoveTask, splitMoveId) {

  var moveTask = dbTableWithMoveTask.moveTask

  this.shouldIDraw = moveTask.shouldIDraw

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




var SplitMove = function (dbTableWithMoveTask) {

  //**console.log(JSON.stringify(dbTableWithMoveTask.moveTask))

  this.shouldIDraw = dbTableWithMoveTask.moveTask.shouldIDraw

  this.started = new Date()

  this.splitMoveIndex = undefined

  this.splitMoveID = Math.random() * Math.random()

  var movesToSend = []

  dbTableWithMoveTask.moveTask.moveCoords.forEach((moveCoord, index) => {

    movesToSend.push(new MoveToSend(moveCoord, index, dbTableWithMoveTask, this.splitMoveID))

  })

  this.movesToSend = movesToSend //this will get empty as we send the moves out for processing

  this.moves = movesToSend.slice() //this should stay full

  this.thinkers = [] //this will get filled with the clients working on this splitmove

  this.gameNum = dbTableWithMoveTask._id

  this.origTable = dbTableWithMoveTask.table

  this.origMoveTask = dbTableWithMoveTask.moveTask

  this.pendingMoveCount = dbTableWithMoveTask.moveTask.moveCoords.length

}
var DeepeningTask = function (smallMoveTask) { //keep this fast, designed for main thread and mainWorker ???not sure..     //smallMoveTask is a smallMoveTask, to be deepend further

  this.shouldIDraw = smallMoveTask.sharedData.shouldIDraw

  this.mod = smallMoveTask.mod

  this.gameNum = smallMoveTask.sharedData.gameNum

  this.progress = smallMoveTask.progress

  this.resolverArray = []



  this.initialWNext = smallMoveTask.sharedData.origWNext


  this.moveStr = [
    smallMoveTask.moveCoords[0],
    smallMoveTask.moveCoords[1],
    smallMoveTask.moveCoords[2],
    smallMoveTask.moveCoords[3]
  ]            //smallMoveTask.stepMove //all resulting tables relate to this movestring: deppeningtask is made of smallmovetask..



  this.initialTreeMoves = [this.moveStr] //to put in first smallmovetask

  this.startingTable = smallMoveTask.sharedData.origTable //this was calculated in advance when getting the first moves: that resulted in this.everything
  this.startingAllPastTables = smallMoveTask.sharedData.allPast
  //**console.log(smallMoveTask)

  this.thisTaskTable = moveIt(this.moveStr, this.startingTable, true) //this is the first and should be only time calculating this!!!!!
  //takes time
  this.firstDepthValue = this.startingTable[smallMoveTask.moveCoords[2]][smallMoveTask.moveCoords[3]][1]              //smallMoveTask.firstDepthValue

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


  var initialSmallDeepeningTask = new SmallDeepeningTask(this.thisTaskTable, !this.initialWNext, this.actualDepth, this.initialTreeMoves, this.desiredDepth, this.firstDepthValue, smallMoveTask.cfColor, false, this.gameNum, this.mod, this.shouldIDraw)

  //this.value=initialSmallDeepeningTask.score

  this.smallDeepeningTasks = [initialSmallDeepeningTask] //to be sent out for multiplying when processing for level 2 (unless desireddepth is 1)

  //this.pendingSmallDeepeningTasks=[]				//here we will keep the pending smalltasks: sent out 

  this.solvedSmallDeepeningTasks = [] //here we will keep the results until stepping to next depth, ready for next level when this.length equals count


}





var SmallMoveTask = function (moveCoord, index, dbTable) { //deptObj has data to keep track of deepening



  this.firstDepthValue = dbTable.table[moveCoord[2]][moveCoord[3]][1]	//doesnt care about enPass!!     //--

  if (dbTable.desiredDepth > 0) {                                    //#
    this.desiredDepth = dbTable.desiredDepth
  } else {
    this.desiredDepth = 3 //should be good, on 4th we check what he could hit but not generate any tables and this should match the old styles performance
  }


  this.oppKingPos = dbTable.oppKingPos //aTK will need this, should be the moved kings pos is moved!!!!  //#

  this._id = dbTable._id //server will need this when receiving solved moves //#

  this.cfMoveCoords = moveCoord //4 numbers      //##

  var stepMove = moveCoord//[0], moveCoord[1], moveCoord[2], moveCoord[3])      //-- do it on client

  this.stepMove = stepMove //4 char string       //--above

  this.moveStrings = []

  this.moveStrings.push(stepMove)


  this.retMoves = [] //ai will fill

  //this.table=moveIt(this.moveStr,dbTable.table,true)	//dontprotect works?? !!!!

  //this.value=dbTable.value

  this.allPast = dbTable.allPastTables //ai needs it to avoid loop  //#

  this.cfTable = dbTable.table //ai needs to know original table             //#
  //this.cfMoveCoords=moveCoord
  this.moveIndex = index //who needs this??!!!!!!!

  this.origProtect = dbTable.origProtect //this should go in origData!!!!

  this.cfColor = dbTable.wNext //this could too...

  //this.deepWNext=dbTable.wNext

  //this.stepMove=0

  this.origData = dbTable.origData // itt adom at ami kozos az osszes smalltaskban

  this.value = this.origData //ez meg minek is


  this.fHitValue = [0] //initial value, should happen masutt     //--



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



var TempMoveTask = function (dbTable) {

  //this.rnd=Math.random()
  // this.created = new Date()
  // 	.getTime()

  //this.allTempTables = []

  this.desiredDepth = dbTable.desiredDepth

  dbTable.oppKingPos = whereIsTheKing(dbTable.table, !dbTable.wNext)


  var moveCoords = getAllMoves(dbTable.table, dbTable.wNext, false, 0, true)



  dbTable.origProtect = protectTable(dbTable.table, dbTable.wNext)
  dbTable.origData = getTableData(dbTable.table, dbTable.wNext)

  dbTable.origDeepDatatt = getHitScores(dbTable.table, true, true)

  dbTable.origDeepDatatf = getHitScores(dbTable.table, true, false)

  dbTable.origDeepDataft = getHitScores(dbTable.table, false, true)

  dbTable.origDeepDataff = getHitScores(dbTable.table, false, false)



  this.dontLoop = false

  if (dbTable.origData[0] > 1) {
    this.dontLoop = true
  }




  var moves = []

  moveCoords.forEach(function (moveCoord, index) {
    moves.push(new SmallMoveTask(moveCoord, index, dbTable))
    //movesToSend.push(moves[moves.length-1])


  })

  this.movesToSend = moves.slice() //copy it, these we vill sen out


  this.moves = moves






}



var Task = function (command, data, message, taskNum) {

  var rnd = Math.random()
  this.rnd = rnd

  if (taskNum) {
    this.taskNum = taskNum
  }
  else {
    this.taskNum = rnd
  }



  this.command = command
  this.message = message
  this.data = data
  this.response = {}

  var fstTime = new Date()
    .getTime()

  this.created = fstTime
  this.called = fstTime




}

var Dbuser = function (name, pwd) {
  this.name = name
  this.pwd = pwd
  this.games = [] //his recent games 

}
////
var FakeDbTable = function (_id, wName, bName) { //used for speed testing only


  this.pendingMoveCount = 0

  this.returnedMoves = []

  this._id = _id
  this.wName = wName
  this.bName = bName


  this.aiToMove = false //unused
  this.toBeChecked = true //unused
  this.gameIsOn = true
  this.whiteWon = false
  this.blackWon = false
  this.isDraw = false

  this.askWhiteDraw = false
  this.askBlackDraw = false

  this.whiteCanForceDraw = false
  this.blackCanForceDraw = false


  this.learner = false
  this.learnerIsBusy = false



  this.wNext = true
  this.aiOn = false
  this.chat = []
  this.moves = []
  this.pollNum = 1
  this.allPastTables = []

  this.created = new Date()
    .getTime()
  this.moved = this.created

  this.table = new Array(8) //create 8x8 array
  for (var i = 0; i < 8; i++) {
    this.table[i] = new Array(8)
  }

  for (var j = 2; j < 6; j++) { //make the blanks blank
    for (i = 0; i < 8; i++) {
      this.table[i][j] = [0, 0, 0, false, false]
    }
  }

  for (var i = 0; i < 8; i++) { //row of white pawns

    this.table[i][1] = [0, 0, 0, false, false] //,pawnCanMove]
  }
  for (var i = 0; i < 8; i++) { //row of black pawns
    this.table[i][6] = [1, 1, 0, false, false] //,pawnCanMove]
  }

  this.table[0][0] = [0, 0, 0, true, false] //,rookCanMove]				//rooks		//0 stands for times it moved
  this.table[7][0] = [0, 0, 0, true, false] //,rookCanMove]
  this.table[0][7] = [0, 0, 0, true, false] //,rookCanMove]
  this.table[7][7] = [0, 0, 0, true, false] //,rookCanMove]

  this.table[1][0] = [2, 3, 0, true, false] //,horseCanMove]					//knights
  this.table[6][0] = [2, 3, 0, true, false] //,horseCanMove]
  this.table[1][7] = [1, 3, 0, true, false] //,horseCanMove]
  this.table[6][7] = [1, 3, 0, true, false] //,horseCanMove]

  this.table[2][0] = [0, 0, 0, true, false] //,bishopCanMove]				//bishops
  this.table[5][0] = [0, 0, 0, true, false] //,bishopCanMove]
  this.table[2][7] = [0, 0, 0, true, false] //,bishopCanMove]
  this.table[5][7] = [0, 0, 0, true, false] //,bishopCanMove]

  this.table[3][0] = [0, 0, 0, true, false] //,queenCanMove]				//w queen
  this.table[4][0] = [2, 9, 0, true, false] //,kingCanMove]				//w king

  this.table[3][7] = [0, 0, 0, true, false] //,queenCanMove]				//b q
  this.table[4][7] = [1, 9, 0, true, false] //,kingCanMove]				//b k

  this.table = addMovesToTable(this.table, true)
  //protectPieces(this.table,true)
  //protectPieces(this.table,false)
}

var Dbtable = function (_id, wName, bName) { //class

  this.moveCount = 0

  this.pendingMoveCount = 0
  this.desiredDepth = 0	//will set after creating, at each move step
  this.returnedMoves = []

  this._id = _id
  this.wName = wName
  this.bName = bName


  this.aiToMove = false //unused
  this.toBeChecked = true //unused
  this.gameIsOn = true
  this.whiteWon = false
  this.blackWon = false
  this.isDraw = false

  this.askWhiteDraw = false
  this.askBlackDraw = false

  this.whiteCanForceDraw = false
  this.blackCanForceDraw = false


  this.learner = false
  this.learnerIsBusy = false



  this.wNext = true
  this.aiOn = false
  this.chat = []
  this.moves = []
  this.pollNum = 1
  this.allPastTables = []

  this.created = new Date()
    .getTime()
  this.moved = this.created

  this.table = new Array(8) //create 8x8 array
  for (var i = 0; i < 8; i++) {
    this.table[i] = new Array(8)
  }

  for (var j = 2; j < 6; j++) { //make the blanks blank
    for (i = 0; i < 8; i++) {
      this.table[i][j] = [0, 0, 0, false, false]
    }
  }

  for (var i = 0; i < 8; i++) { //row of white pawns

    this.table[i][1] = [2, 1, 0, false, false] //,pawnCanMove]
  }
  for (var i = 0; i < 8; i++) { //row of black pawns
    this.table[i][6] = [1, 1, 0, false, false] //,pawnCanMove]
  }

  this.table[0][0] = [2, 4, 0, true, false] //,rookCanMove]				//rooks		//0 stands for times it moved
  this.table[7][0] = [2, 4, 0, true, false] //,rookCanMove]
  this.table[0][7] = [1, 4, 0, true, false] //,rookCanMove]
  this.table[7][7] = [1, 4, 0, true, false] //,rookCanMove]

  this.table[1][0] = [2, 3, 0, true, false] //,horseCanMove]					//knights
  this.table[6][0] = [2, 3, 0, true, false] //,horseCanMove]
  this.table[1][7] = [1, 3, 0, true, false] //,horseCanMove]
  this.table[6][7] = [1, 3, 0, true, false] //,horseCanMove]

  this.table[2][0] = [2, 2, 0, true, false] //,bishopCanMove]				//bishops
  this.table[5][0] = [2, 2, 0, true, false] //,bishopCanMove]
  this.table[2][7] = [1, 2, 0, true, false] //,bishopCanMove]
  this.table[5][7] = [1, 2, 0, true, false] //,bishopCanMove]

  this.table[3][0] = [2, 5, 0, true, false] //,queenCanMove]				//w queen
  this.table[4][0] = [2, 9, 0, true, false] //,kingCanMove]				//w king

  this.table[3][7] = [1, 5, 0, true, false] //,queenCanMove]				//b q
  this.table[4][7] = [1, 9, 0, true, false] //,kingCanMove]				//b k

  this.table = addMovesToTable(this.table, true)
  //protectPieces(this.table,true)
  //protectPieces(this.table,false)
}