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

var steem = require('./steem/index');
var express = require('express')
var app = express()
var bodyParser = require('body-parser')
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
  if (!req.body.block || !Number.isInteger(parseInt(req.body.block))) {
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

app.listen(6060)
