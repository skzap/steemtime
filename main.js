// this api requires two accounts in order to not lose control over the funds required for making transfers
var accounts = [
  'heimindanger',
  'curator'
];
var wif = [
  'x',
  'x'
]
var amount = '0.001 SBD'
var allTx = []
var max = Math.pow(2,40)-1

var steem = require('./steem/index')
var express = require('express')
var app = express()
var bodyParser = require('body-parser')

console.log('Starting getting all transactions...')
loadTxs(2000, 2000, true, function() {
  console.log('All '+allTx.length+' tx loaded')

  app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
  }));
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  // hash: any hexadecimal hash
  app.post('/time/request', function (req, res) {
    if (!req.body.hash) {
      res.end('Error: no hash!')
      return
    }

    // ignoring all non hexadecimal chars
    var memo = req.body.hash.replace(/[^A-Fa-f0-9]/g, "");
    memo = memo.toUpperCase();

    // randomly transfering funds from one account to another
    var coinflip = Math.floor(Math.random()*2)%2;
    steem.broadcast.transfer(wif[coinflip], accounts[coinflip], accounts[(coinflip+1)%2], amount, memo, function(e,transfer) {
      if (e) throw e;
      console.log(transfer);
      delete(transfer.expired);
      delete(transfer.id);

      steem.api.getBlockHeader(transfer.block_num, function(e,block) {
        if (e) throw e;
        var stamp = {
          hash: memo,
          timestamp: block.timestamp,
          detail: transfer
        }
        console.log(stamp)
        res.end(JSON.stringify(stamp))
        loadTxs(max, 10, false, function(){console.log('Now '+allTx.length+' tx')})
      })
    })
  })

  // hash: hash to search for
  app.post('/time/verify', function (req, res) {
    if (!req.body.hash) {
      res.end('Error: no hash!')
      return
    }

    var tx = find_by_memo(req.body.hash);
    if (!tx) {
      res.end(JSON.stringify({result: false, detail: 'hash not found'}))
      return;
    }
    steem.api.getBlock(tx[1].block, function(e,block) {
      if (!block) {
        res.end(JSON.stringify({result: false, detail: 'block not found'}))
        return;
      }
      for (var i = 0; i < block.transactions.length; i++) {
        if (block.transactions[i].operations[0][0] != 'transfer') continue;
        if (!block.transactions[i].operations[0][1].memo) continue;
        if (block.transactions[i].operations[0][1].memo == req.body.hash) {
          res.end(JSON.stringify({
            result: true,
            block: tx[1].block,
            timestamp: block.timestamp
          }));
          return;
        }
      }
      res.end(JSON.stringify({result: false, detail: 'hash not found in this block'}))
      return;
    })
  })

  app.listen(6060, function() {
    console.log('Timestamping service now online on port 6060')
  })
});

function loadTxs(maximum, limit, recursive, cb) {
  console.log('get_acc_history', accounts[1], maximum, limit)
  steem.api.getAccountHistory(accounts[1], maximum, limit, function(e,r) {
    for (var i = 0; i < r.length; i++) {
      if (r[i][1].op[0] == 'transfer' && !exists(r[i][0])) {
        allTx.push(r[i]);
      }
    }
    if (r[r.length-1][0] == maximum && recursive) loadTxs(maximum+2000, 2000, true, cb);
    else cb();
  })
}

function exists(tx_num) {
  for (var i = 0; i < allTx.length; i++) {
    if (allTx[i][0] == tx_num) return true;
  }
  return false;
}

function find_by_memo(memo) {
  for (var i = 0; i < allTx.length; i++) {
    if (allTx[i][1].op[1].memo == memo) return allTx[i];
  }
  return;
}
