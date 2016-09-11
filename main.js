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
loadTxs(max, function(total) {
  console.log('All '+total+' tx loaded')

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
          method: 'STEEM',
          hash: memo,
          timestamp: block.timestamp,
          detail: transfer
        }
        console.log(stamp)
        res.end(JSON.stringify(stamp))
      })
    })
  })

  // hash: hash to search for
  // block: steem block number to look up
  app.post('/time/check', function (req, res) {
    if (!req.body.hash) {
      res.end('Error: no hash!')
      return
    }
    if (!req.body.block) {
      res.end('Error: no block number!')
      return
    }

    steem.api.getBlock(req.body.block, function(e,block) {
      if (!block)
        res.end(JSON.stringify({result: false, detail: 'block not found'}))
      for (var i = 0; i < block.transactions.length; i++) {
        if (block.transactions[i].operations[0][0] != 'transfer') continue;
        if (!block.transactions[i].operations[0][1].memo) continue;
        if (block.transactions[i].operations[0][1].memo == req.body.hash)
          res.end(JSON.stringify({
            result: true,
            timestamp: block.timestamp
          }))
      }
      res.end(JSON.stringify({result: false, detail: 'hash not found in this block'}))
    })
  })

  app.post('/time/search', function (req, res) {
    if (!req.body.hash) {
      res.end('Error: no hash!')
      return
    }

    var tx = find_by_memo(req.body.hash);
    if (tx) res.end(JSON.stringify({result: true, tx: tx}))
    else res.end(JSON.stringify({result: false, detail: 'this hash was not found'}))
  })

  app.listen(6060, function() {
    console.log('Timestamping service now online on port 6060')
  })
});

function loadTxs(maximum, cb) {
  //console.log(maximum)
  var number = 2000;
  if (maximum < 2000)  number = maximum;
  console.log('get_acc_history', accounts[1], maximum, number)
  steem.api.getAccountHistory(accounts[1], maximum, number, function(e,r) {
    for (var i = 0; i < r.length; i++) {
      if (r[i][1].op[0] == 'transfer' && !exists(r[i][0]))
        allTx.push(r[i]);
      if (r[i][0] < max) max = r[i][0];
    }
    if (r.length > 2000) loadTxs(max, cb);
    else cb(allTx.length);
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
