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

function pawnCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  if (c === 2) { //white pawn
    pushAidXN(k, l, k + 1, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    pushAidXN(k, l, k - 1, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    return;
  }
  pushAidXN(k, l, k + 1, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidXN(k, l, k - 1, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
}

function rookCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
}

function bishopCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  var i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j -= 1;
  }
}

function queenCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  var i = k + 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = k - 1;
  while (pushAidNN(k, l, i, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = l + 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i += 1;
  i = l - 1;
  while (pushAidNN(k, l, k, i, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) i -= 1;
  i = k + 1;
  var j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j += 1;
  }
  i = k - 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j -= 1;
  }
  i = k - 1;
  j = l + 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i -= 1;
    j += 1;
  }
  i = k + 1;
  j = l - 1;
  while (pushAidNN(k, l, i, j, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/)) {
    i += 1;
    j -= 1;
  }
}

function kingCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  pushAidN(k, l, k + 1, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  //sanc
  if (moveTable[k][l][3]) { //if the king hasnt moved yet, 
    // ha nincs sakkban, nem is ugrik at sakkot, minden ures kozotte
    if (moveTable[0][l][3] && // unmoved rook on [0][l]
      moveTable[1][l][0] === 0 && moveTable[2][l][0] === 0 && moveTable[3][l][0] === 0) { //empty between
      pushAidN(k, l, 2, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    }
    if (moveTable[7][l][3] && moveTable[5][l][0] === 0 && moveTable[6][l][0] === 0) { // unmoved rook on [7][l] && empty between
      pushAidN(k, l, 6, l, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
    }
  }
}

function horseCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, /*protectScore, possibleMoves*/) {
  pushAidN(k, l, k + 1, l + 2, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 1, l - 2, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l + 2, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 1, l - 2, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 2, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k + 2, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 2, l + 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
  pushAidN(k, l, k - 2, l - 1, c, moveTable, protectedArray, iHitMoves, /*protectScore, possibleMoves*/);
}

function whatsThereN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [0];
}

function whatsThereNN(i, j, table) {
  if (i >= 0 && j >= 0 && i <= 7 && j <= 7) return table[i][j];
  return [3]; // off the table
}

function pushAidN(k, l, x, y, c, table, protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
  var isThere = whatsThereN(x, y, table);
  if (isThere[0] !== 0) { //van ott vmi
    if (isThere[0] === c) {
      //my piece is there
      // protectScore[0] += 1;
      protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
    } else {
      //opps piece is there
      // possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
    }
    return true;
  }
  // possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidXN(k, l, x, y, c, table, protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
  if (x < 0 || x > 7) return false; // off the table
  if (table[x][y][0] !== 0) { //van ott vmi
    if (table[x][y][0] === c) {
      //my piece is there
      // protectScore[0] += 1;
      protectedArray[x][y] = true; //protected
    } else {
      //opps piece is there
      // possibleMoves[8 * x + y] = true; // TODO: did this break the stats?
      iHitMoves[iHitMoves.length] = [k, l, x, y, table[k][l][1], table[x][y][1]]; //[who k,l where to x,y who, hits]
    }
    return true;
  }
  // possibleMoves[8 * x + y] = true;
  return false;
}

function pushAidNN(k, l, x, y, c, table, protectedArray, iHitMoves, /*protectScore, possibleMoves*/) {
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
    protectedArray[x][y] = true; //protected		//moveit will clear, fastmove not???!!!
  } else {
    //opps piece is there
    // possibleMoves[8 * x + y] = true;
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

function newCanMove(k, l, c, moveTable, protectedArray, iHitMoves, protectScore/*, possibleMoves*/) {
  //[who k,l where to x,y who, hits]
  var what = moveTable[k][l][1];
  switch (what) {
    case 1:
      pawnCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 2:
      bishopCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 3:
      horseCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 4:
      rookCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 5:
      queenCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
    case 9:
      kingCanMoveN(k, l, moveTable, protectedArray, c, iHitMoves, protectScore/*, possibleMoves*/);
      break;
  }
}

function getHitScores(origTable, wNext, flipIt, wPlayer) {
  
  var iHitCoords = []; //[who k,l where to x,y, who, hits]
  var heHitsCoords = [];
  // var myprotectScore = new Uint8Array(1); //[0]
  // var hisprotectScore = new Uint8Array(1); //[0]
  var myAllHit = 0;
  var hisAllHit = 0;
  
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
  // var allMyMoves = {};
  // var hisKingMoves = {};
  for (var lookI = 0; lookI < 8; lookI += 1) {
    for (var lookJ = 0; lookJ < 8; lookJ += 1) { //look through the table

      if (origTable[lookI][lookJ][0] === c) {
        ////////found my piece/////////
        ////////get all my moves and places i protect
        // if (origTable[lookI][lookJ][1] === 1) {
        //   if (c === 1) {
        //     pawnVal += (7 - lookJ);
        //   } else {
        //     pawnVal += lookJ;
        //   }
        // }

        // throw new Error('savedya')

        newCanMove(lookI, lookJ, c, origTable, protectedArray, iHitCoords, /*myprotectScore, allMyMoves*/); //newCanMove will protect the table
        //and append all my hits to iHitCoords
        //will increase myprotectscore, inaccurate!!!!!!!				
      } else {
        if (origTable[lookI][lookJ][0] !== 0) { ////////found opponent's piece/////////												
          // if (origTable[lookI][lookJ][1] === 1) {
          //   if (nc === 1) {
          //     pawnVal -= (7 - lookJ);
          //   } else {
          //     pawnVal -= lookJ;
          //   }
          // }
          newCanMove(lookI, lookJ, nc, origTable, protectedArray, heHitsCoords, /*hisprotectScore, origTable[lookI][lookJ][1] === 9 ? hisKingMoves : {}*/);
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
    // if (thisValue > myBestHit) { //remember best

    //   myBestHit = thisValue;
    //   myBestHitCoords = hitCoords;
    // }
    myAllHit += thisValue;
  });
  heHitsCoords.forEach(function (hitCoords) {
    var thisValue = 0;
    if (protectedArray[hitCoords[2]][hitCoords[3]]) { //if cell is protected

      thisValue = hitCoords[5] - hitCoords[4]; //kivonja amivel lep

    } else {
      thisValue = hitCoords[5]; //normal hitvalue

    }
    // if (thisValue > hisBestHit) { //remember best

    //   hisBestHit = thisValue;
    //   //
    // }
    hisAllHit += thisValue;
  });
  // var protecScore = myprotectScore[0] - hisprotectScore[0];
  var allhitScore = myAllHit - hisAllHit;
  // var hisKingMArr = Object.keys(hisKingMoves);
  // var hisKingMoveScore = 8 - (hisKingMArr.length);
  // var blockHisKingScore = hisKingMArr.reduce((p, c) => allMyMoves[c] ? p + 1 : p, 0);
  // pawnVal *= fwV * fwVdef;
  // hisKingMoveScore *= hKM * hKMdef;
  // blockHisKingScore *= bHK * bHKdef;
  var result = new Int32Array(1);
  result[0] = 0//(myBestHit * 65536) - (hisBestHit * 4096);
  if (flipIt) {
    result[0] -= (allhitScore) /* + (pawnVal) + (hisKingMoveScore << 9) + (blockHisKingScore << 10)*/ ; //1633333
  } else {
    result[0] += (allhitScore) /* + (pawnVal) + (hisKingMoveScore << 9) + (blockHisKingScore << 10)*/; //1633333
  }
  return result;
}

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
        sdt.mod, sdt.shouldIDraw)]
    }
  }
  //these new tasks go to a fifo array, we solve the tree bit by bit
  //keeping movestrings only, not eating memory with tables

  //get hitvalue for each move, keep best ones only
  //end of tree check if we got it wrong and go back if treevalue gets less!!!!!!!!!!!!!!!! // TODO: what did i mean there?
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
        if (isNegative) {
          newScore = (sdt.score << 16) - getHitScores(sdt.table,
            sdt.wNext, false, sdt.wPlayer,
            sdt.mod, sdt.shouldIDraw)[0]
        } else {

          const g = getHitScores(sdt.table,
            sdt.wNext, true, sdt.wPlayer,
            sdt.mod, sdt.shouldIDraw)[0]

          if (g < -37) console.log({s:sdt.score, g, m: sdt.moveTree })


          newScore = (sdt.score << 16) + g
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
          // sdt.mod,
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

}

export const DeepeningTask = function (smallMoveTask) { //keep this fast, designed for main thread and mainWorker ???not sure..     //smallMoveTask is a smallMoveTask, to be deepend further

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
