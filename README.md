# steemtime
api for making trusted timestamps on the steem blockchain for free

## install
```
git clone https://github.com/skzap/steemtime.git
cd steemtime
npm install
cd steem
npm install
cd ..
node main.js
```

## use the service for free
this api is accessible for free on http://steemwhales.com/timestamping/

## use programmatically
###Stamping
```
curl --data "hash=<your hash here>" http://steemwhales.com:6060/time/request
```
###Verifying
```
curl --data "hash=<your hash here>" http://steemwhales.com:6060/time/verify
```
